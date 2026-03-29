#!/usr/bin/env tsx
/**
 * Audit OpenAPI specs against MCP tool implementations
 * 
 * This script:
 * 1. Reads all markdown files in holded_docs/ with OpenAPI specs
 * 2. Extracts parameters from OpenAPI specs
 * 3. Finds matching tool implementations
 * 4. Compares parameters and identifies discrepancies
 * 5. Generates a detailed report
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

interface OpenAPIParam {
  name: string;
  type: string;
  required: boolean;
  in: 'path' | 'query' | 'body';
  description?: string;
  schema?: any;
}

interface OpenAPISpec {
  path: string;
  method: string;
  operationId?: string;
  parameters: OpenAPIParam[];
  requestBody?: {
    content: {
      'application/json': {
        schema: any;
      };
    };
  };
}

interface SchemaParam {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

interface EndpointAnalysis {
  file: string;
  endpoint: string;
  method: string;
  toolName?: string;
  specParams: OpenAPIParam[];
  implParams: SchemaParam[];
  issues: string[];
  status: 'match' | 'mismatch' | 'not_implemented' | 'extra_params';
}

/**
 * Find the matching closing bracket, handling nested brackets and string literals
 * @param content - The content to search
 * @param startIndex - The index of the opening bracket
 * @param openChar - The opening bracket character (e.g., '{', '(', '[')
 * @param closeChar - The closing bracket character (e.g., '}', ')', ']')
 * @returns The index of the matching closing bracket, or -1 if not found
 */
function findMatchingBracket(content: string, startIndex: number, openChar: string, closeChar: string): number {
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let escaped = false;
  
  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];
    
    // Handle escape sequences
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      continue;
    }
    
    // Handle string literals
    if ((char === '"' || char === "'" || char === '`') && !inString) {
      inString = true;
      stringChar = char;
      continue;
    }
    
    if (char === stringChar && inString) {
      inString = false;
      stringChar = '';
      continue;
    }
    
    if (inString) continue;
    
    // Count brackets
    if (char === openChar) {
      depth++;
    } else if (char === closeChar) {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  
  return -1;
}

/**
 * Extract the complete content between balanced brackets
 * @param content - The content to search
 * @param startIndex - The index of the opening bracket (inclusive)
 * @returns The content between brackets (excluding the brackets themselves)
 */
function extractBalancedContent(content: string, startIndex: number, openChar = '{', closeChar = '}'): string {
  const endIndex = findMatchingBracket(content, startIndex, openChar, closeChar);
  if (endIndex === -1) return '';
  return content.slice(startIndex + 1, endIndex);
}

/**
 * Infer OpenAPI type from a custom schema name
 * @param schemaName - The schema name (e.g., 'IdSchema', 'DocumentTypeSchema')
 * @returns The inferred OpenAPI type
 */
function inferTypeFromSchemaName(schemaName: string): string {
  // Most custom schemas are string-based
  const stringSchemas = ['IdSchema', 'DocumentTypeSchema', 'ResponseFormatSchema'];
  if (stringSchemas.some(s => schemaName.includes(s))) {
    return 'string';
  }
  // Default to string for unknown schemas
  return 'string';
}

/**
 * Parse field definitions from a Zod schema body using bracket-aware parsing
 * @param schemaBody - The content inside z.strictObject({...})
 * @returns Array of parsed field parameters
 */
function parseZodFields(schemaBody: string): SchemaParam[] {
  const params: SchemaParam[] = [];
  const parsedFieldNames = new Set<string>();
  
  // First, collect all field start positions for z.xxx() patterns
  // Handle both: fieldName: z.type() and fieldName: z\n  .type()
  const fieldStartPattern = /(\w+)\s*:\s*z\s*\./g;
  const fieldStarts: { name: string; index: number; zIndex: number }[] = [];
  let match;
  
  while ((match = fieldStartPattern.exec(schemaBody)) !== null) {
    // Find the position of 'z' in the match
    const zPos = match[0].indexOf('z');
    fieldStarts.push({
      name: match[1],
      index: match.index,
      zIndex: match.index + zPos, // Position of 'z'
    });
  }
  
  // Now parse each field using the positions
  for (let i = 0; i < fieldStarts.length; i++) {
    const field = fieldStarts[i];
    const fieldName = field.name;
    const fieldStartIndex = field.zIndex;
    
    // Field ends at the next field's start or at the end of the schema body
    let fieldEndIndex: number;
    if (i < fieldStarts.length - 1) {
      fieldEndIndex = fieldStarts[i + 1].index;
    } else {
      fieldEndIndex = schemaBody.length;
    }
    
    // Walk backwards to remove trailing whitespace/commas
    while (fieldEndIndex > fieldStartIndex && /[\s,]/.test(schemaBody[fieldEndIndex - 1])) {
      fieldEndIndex--;
    }
    
    // Extract the complete field definition
    const fieldDef = schemaBody.slice(fieldStartIndex, fieldEndIndex);
    
    // Extract the Zod type (first z.xxx call, handling whitespace between z and .method)
    const typeMatch = fieldDef.match(/z\s*\.(\w+)/);
    const zodType = typeMatch ? typeMatch[1] : 'string';
    
    // Check if .optional() appears anywhere in this field's definition chain
    const isOptional = fieldDef.includes('.optional()');
    
    // Extract description if present (handle multi-line descriptions)
    const descMatch = fieldDef.match(/\.describe\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/);
    const description = descMatch ? descMatch[1] : undefined;
    
    // Map Zod types to OpenAPI types
    let type = 'string';
    if (zodType === 'number') type = 'number';
    else if (zodType === 'boolean') type = 'boolean';
    else if (zodType === 'array') type = 'array';
    else if (zodType === 'object' || zodType === 'strictObject') type = 'object';
    else if (zodType === 'enum') type = 'string'; // enums are typically strings
    
    params.push({
      name: fieldName,
      type,
      required: !isOptional,
      description,
    });
    parsedFieldNames.add(fieldName);
  }
  
  // Second pass: parse fields that reference other schemas (e.g., DocumentTypeSchema, IdSchema)
  // Pattern: fieldName: SomeSchema or fieldName: SomeSchema.describe("...")
  const schemaRefPattern = /(\w+)\s*:\s*([A-Z]\w*Schema)(?:\.describe\s*\(\s*["'`]([^"'`]+)["'`]\s*\))?/g;
  
  while ((match = schemaRefPattern.exec(schemaBody)) !== null) {
    const fieldName = match[1];
    const schemaName = match[2];
    const description = match[3];
    
    // Skip if already parsed via z.xxx pattern
    if (parsedFieldNames.has(fieldName)) continue;
    
    // Infer type from schema name
    const type = inferTypeFromSchemaName(schemaName);
    
    // Schema references are required by default (no .optional() on them directly)
    params.push({
      name: fieldName,
      type,
      required: true,
      description,
    });
    parsedFieldNames.add(fieldName);
  }
  
  return params;
}

// Valid HTTP methods in OpenAPI
const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

/**
 * Extract OpenAPI spec from markdown file
 */
function extractOpenAPISpec(filePath: string): OpenAPISpec | null {
  const content = readFileSync(filePath, 'utf-8');
  
  // Find JSON code block with OpenAPI spec
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
  if (!jsonMatch) return null;
  
  try {
    const spec = JSON.parse(jsonMatch[1]);
    
    // Extract path and method
    const paths = Object.keys(spec.paths || {});
    if (paths.length === 0) return null;
    
    const path = paths[0];
    const pathObj = spec.paths[path] || {};
    
    // Filter to only HTTP methods (exclude 'parameters', 'servers', etc.)
    const methods = Object.keys(pathObj)
      .filter(key => HTTP_METHODS.includes(key.toLowerCase()));
    if (methods.length === 0) return null;
    
    const method = methods[0].toUpperCase();
    const operation = pathObj[methods[0]];
    
    // Extract parameters
    const parameters: OpenAPIParam[] = [];
    
    // Path-level parameters (shared across all methods)
    if (pathObj.parameters) {
      for (const param of pathObj.parameters) {
        parameters.push({
          name: param.name,
          type: param.schema?.type || 'string',
          required: param.required || false,
          in: param.in,
          description: param.description,
          schema: param.schema,
        });
      }
    }
    
    // Operation-level parameters (specific to this method)
    if (operation.parameters) {
      for (const param of operation.parameters) {
        // Skip if already added from path-level
        if (parameters.some(p => p.name === param.name && p.in === param.in)) continue;
        
        parameters.push({
          name: param.name,
          type: param.schema?.type || 'string',
          required: param.required || false,
          in: param.in,
          description: param.description,
          schema: param.schema,
        });
      }
    }
    
    // Request body parameters
    if (operation.requestBody?.content?.['application/json']?.schema) {
      const bodySchema = operation.requestBody.content['application/json'].schema;
      const bodyParams = extractSchemaProperties(bodySchema);
      for (const param of bodyParams) {
        parameters.push({
          name: param.name,
          type: param.type,
          required: param.required,
          in: 'body',
          description: param.description,
          schema: param.schema,
        });
      }
    }
    
    return {
      path,
      method,
      operationId: operation.operationId,
      parameters,
      requestBody: operation.requestBody,
    };
  } catch (error) {
    console.error(`Error parsing OpenAPI spec in ${filePath}:`, error);
    return null;
  }
}

/**
 * Extract properties from a JSON schema
 */
function extractSchemaProperties(schema: any, prefix = ''): OpenAPIParam[] {
  const params: OpenAPIParam[] = [];
  
  if (!schema || typeof schema !== 'object') return params;
  
  // Handle allOf
  if (schema.allOf) {
    for (const subSchema of schema.allOf) {
      params.push(...extractSchemaProperties(subSchema, prefix));
    }
    return params;
  }
  
  // Handle properties
  if (schema.properties) {
    const required = schema.required || [];
    
    for (const [name, prop] of Object.entries(schema.properties)) {
      const propSchema = prop as any;
      const fullName = prefix ? `${prefix}.${name}` : name;
      
      if (propSchema.type === 'object' && propSchema.properties) {
        // Nested object - recurse
        params.push(...extractSchemaProperties(propSchema, fullName));
      } else {
        params.push({
          name: fullName,
          type: propSchema.type || 'string',
          required: required.includes(name),
          in: 'body',
          description: propSchema.description,
          schema: propSchema,
        });
      }
    }
  }
  
  return params;
}

/**
 * Known endpoint path mappings where documentation differs from implementation
 */
const ENDPOINT_PATH_MAPPINGS: Record<string, string[]> = {
  // Accounting
  '/entry': ['/dailyledger'],
  '/account': ['/accounts'],
  '/chartofaccounts': ['/accounts'],
  
  // Contacts
  '/contacts/groups': ['/contactgroups'],
  '/contacts/groups/{groupId}': ['/contactgroups/{groupId}'],
  
  // Numbering series (docs have {type}/{id}, mapping has just {id})
  '/numberingseries/{type}/{numberingSeriesId}': ['/numberingseries/{numberingSerieId}'],
  
  // Warehouses (docs have /stock, mapping has /products/stock)
  '/warehouses/{warehouseId}/stock': ['/warehouses/{warehouseId}/products/stock'],
  
  // Documents - tracking and pipeline
  '/documents/{docType}/{documentId}/updatetracking': ['/documents/{docType}/{documentId}/tracking'],
  '/documents/{docType}/{documentId}/pipeline/set': ['/documents/{docType}/{documentId}/pipeline'],
  
  // Employee time tracking (docs use /times, mapping uses /time-trackings)
  '/employees/{employeeId}/times': ['/employees/{employeeId}/time-trackings'],
  '/employees/times/{employeeTimeId}': ['/time-trackings/{timeTrackingId}'],
  '/employees/times': ['/time-trackings'],
};

/**
 * Generate endpoint path variations to handle documentation vs implementation differences
 * E.g., /contacts/groups -> /contactgroups, /contact-groups, etc.
 */
function generateEndpointVariations(endpoint: string): string[] {
  const variations: string[] = [endpoint];
  
  // Check known mappings first
  if (ENDPOINT_PATH_MAPPINGS[endpoint]) {
    variations.push(...ENDPOINT_PATH_MAPPINGS[endpoint]);
  }
  
  // Extract path parts (excluding path parameters like {id})
  const parts = endpoint.split('/').filter(p => p && !p.startsWith('{'));
  const paramMatch = endpoint.match(/(\/\{[^}]+\})+$/);
  const paramSuffix = paramMatch ? paramMatch[0] : '';
  
  if (parts.length >= 1) {
    // Try adding/removing trailing 's' for pluralization
    // E.g., /account -> /accounts, /accounts -> /account
    const lastPart = parts[parts.length - 1];
    const otherParts = parts.slice(0, -1);
    
    if (lastPart.endsWith('s')) {
      // Try singular: /accounts -> /account
      const singular = lastPart.slice(0, -1);
      const newPath = '/' + [...otherParts, singular].join('/');
      variations.push(newPath + paramSuffix);
    } else {
      // Try plural: /account -> /accounts
      const plural = lastPart + 's';
      const newPath = '/' + [...otherParts, plural].join('/');
      variations.push(newPath + paramSuffix);
    }
  }
  
  if (parts.length >= 2) {
    // Try concatenating adjacent non-parameter parts
    // E.g., /contacts/groups -> /contactgroups
    for (let i = 0; i < parts.length - 1; i++) {
      const combined = parts.slice(0, i).concat(
        [parts[i] + parts[i + 1]],
        parts.slice(i + 2)
      );
      const newPath = '/' + combined.join('/');
      variations.push(newPath + paramSuffix);
    }
  }
  
  // Try removing path parameters for matching base endpoints
  // E.g., /numberingseries/{type} -> /numberingseries
  if (paramSuffix) {
    const basePath = endpoint.replace(paramSuffix, '');
    variations.push(basePath);
  }
  
  return [...new Set(variations)];
}

/**
 * Find matching tool name from ENDPOINT_MAPPING.md
 */
function findToolName(endpoint: string, method: string): string | undefined {
  const mappingPath = join(process.cwd(), 'ENDPOINT_MAPPING.md');
  if (!existsSync(mappingPath)) return undefined;
  
  const content = readFileSync(mappingPath, 'utf-8');
  
  // Try multiple endpoint variations to handle documentation vs implementation differences
  const variations = generateEndpointVariations(endpoint);
  
  for (const variation of variations) {
    // Look for pattern: | `/endpoint` | METHOD | `tool_name` |
    const regex = new RegExp(
      `\\|\\s*[\`"]?${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\`"]?\\s*\\|\\s*${method}\\s*\\|\\s*[\`]?([\\w_]+)[\`]?\\s*\\|`,
      'i'
    );
    
    const match = content.match(regex);
    if (match) {
      return match[1];
    }
  }
  
  return undefined;
}

/**
 * Extract schema parameters from Zod schema file using bracket-aware parsing
 */
function extractSchemaParams(schemaPath: string, schemaName: string): SchemaParam[] {
  if (!existsSync(schemaPath)) return [];
  
  const content = readFileSync(schemaPath, 'utf-8');
  
  // Find the schema definition start: export const XxxInputSchema = z.strictObject({
  const schemaStartPattern = new RegExp(
    `export const ${schemaName}InputSchema\\s*=\\s*z\\.(?:strictObject|object)\\s*\\(\\s*\\{`,
    'm'
  );
  
  const startMatch = schemaStartPattern.exec(content);
  if (!startMatch) return [];
  
  // Find the position of the opening brace of the schema object
  const schemaStartIndex = startMatch.index + startMatch[0].length - 1; // Position of '{'
  
  // Use bracket-aware extraction to get the complete schema body
  const schemaBody = extractBalancedContent(content, schemaStartIndex, '{', '}');
  if (!schemaBody) return [];
  
  // Use the improved field parser
  return parseZodFields(schemaBody);
}

/**
 * Convert snake_case to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Map entity name to file name (handles pluralization and special cases)
 */
function entityToFileName(entity: string): string[] {
  // Special mappings for irregular cases
  const specialMappings: Record<string, string[]> = {
    'treasury': ['treasury.ts'],
    'treasuries': ['treasury.ts'],
    'numbering_serie': ['numbering-series.ts'],
    'numbering_series': ['numbering-series.ts'],
    'product_stock': ['products.ts'],
    'products_stock': ['products.ts'],
    'product_image': ['products.ts'],
    'product_images': ['products.ts'],
    'expenses_account': ['expenses-accounts.ts'],
    'expenses_accounts': ['expenses-accounts.ts'],
    'sales_channel': ['sales-channels.ts'],
    'sales_channels': ['sales-channels.ts'],
    'contact_group': ['contacts.ts'],
    'contact_groups': ['contacts.ts'],
    'contact_attachment': ['contacts.ts'],
    'contact_attachments': ['contacts.ts'],
    'daily_ledger': ['daily-ledger.ts'],
    'payment_method': ['treasury.ts'],
    'payment_methods': ['treasury.ts'],
    'booking_location': ['bookings.ts'],
    'booking_locations': ['bookings.ts'],
    'available_slot': ['bookings.ts'],
    'available_slots': ['bookings.ts'],
    'project_time': ['time-tracking.ts'],
    'project_times': ['time-tracking.ts'],
    'employee_time': ['time-tracking.ts'],
    'employee_times': ['time-tracking.ts'],
  };
  
  if (specialMappings[entity]) {
    return specialMappings[entity];
  }
  
  // Convert snake_case to kebab-case for file names
  const kebabCase = entity.replace(/_/g, '-');
  
  // Try multiple variations: singular, plural, as-is
  const variations: string[] = [];
  
  // As-is
  variations.push(`${kebabCase}.ts`);
  
  // Pluralize (simple rules)
  if (!kebabCase.endsWith('s')) {
    if (kebabCase.endsWith('y')) {
      variations.push(`${kebabCase.slice(0, -1)}ies.ts`);
    } else {
      variations.push(`${kebabCase}s.ts`);
    }
  }
  
  // Singularize
  if (kebabCase.endsWith('ies')) {
    variations.push(`${kebabCase.slice(0, -3)}y.ts`);
  } else if (kebabCase.endsWith('s')) {
    variations.push(`${kebabCase.slice(0, -1)}.ts`);
  }
  
  return [...new Set(variations)];
}

/**
 * Schema name mappings for irregular pluralizations and naming conventions
 * Maps from derived name (from tool name) to actual schema name suffix
 */
const SCHEMA_NAME_MAPPINGS: Record<string, string> = {
  'NumberingSerie': 'NumberingSeries',
};

/**
 * Apply schema name mappings to handle irregular naming conventions
 */
function applySchemaNameMapping(schemaName: string): string {
  for (const [from, to] of Object.entries(SCHEMA_NAME_MAPPINGS)) {
    if (schemaName.endsWith(from)) {
      return schemaName.slice(0, -from.length) + to;
    }
  }
  return schemaName;
}

/**
 * Find schema file for a tool using auto-discovery
 */
function findSchemaFile(toolName: string): { path: string; schemaName: string } | null {
  // Parse tool name: holded_{module}_{action}_{entity}
  const match = toolName.match(/^holded_(\w+?)_(\w+?)_(.+)$/);
  if (!match) return null;
  
  const [, module, action, entity] = match;
  
  // Build schema name from action and entity (PascalCase)
  let schemaName = toPascalCase(action) + toPascalCase(entity);
  
  // Apply schema name mappings for irregular naming conventions
  schemaName = applySchemaNameMapping(schemaName);
  
  // Get possible file names for this entity
  const possibleFiles = entityToFileName(entity);
  
  // Try to find the schema file
  const schemasDir = join(process.cwd(), 'src', 'schemas', module);
  
  for (const fileName of possibleFiles) {
    const schemaPath = join(schemasDir, fileName);
    if (existsSync(schemaPath)) {
      // Verify the schema exists in this file
      const content = readFileSync(schemaPath, 'utf-8');
      if (content.includes(`${schemaName}InputSchema`)) {
        return {
          path: schemaPath,
          schemaName,
        };
      }
    }
  }
  
  // Fallback: scan all files in the module directory
  if (existsSync(schemasDir)) {
    const files = readdirSync(schemasDir).filter(f => f.endsWith('.ts'));
    for (const file of files) {
      const schemaPath = join(schemasDir, file);
      const content = readFileSync(schemaPath, 'utf-8');
      if (content.includes(`${schemaName}InputSchema`)) {
        return {
          path: schemaPath,
          schemaName,
        };
      }
    }
  }
  
  return null;
}

/**
 * Normalize OpenAPI types to match Zod type mapping
 * OpenAPI uses 'integer' but Zod uses 'number'
 */
function normalizeType(type: string): string {
  const typeMap: Record<string, string> = {
    'integer': 'number',
    'int': 'number',
    'float': 'number',
    'double': 'number',
  };
  return typeMap[type] || type;
}

/**
 * Convert camelCase to snake_case
 */
function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * Convert snake_case to camelCase
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Find matching implementation parameter by name (handles camelCase vs snake_case)
 */
function findMatchingImplParam(specParamName: string, implParams: SchemaParam[]): SchemaParam | undefined {
  const snakeCaseName = toSnakeCase(specParamName);
  
  return implParams.find(p => 
    p.name === specParamName ||           // Exact match
    p.name === snakeCaseName ||           // camelCase -> snake_case
    p.name === `${snakeCaseName}_id` ||   // projectId -> project_id
    p.name === specParamName.replace('Id', '_id')  // projectId -> project_id (direct)
  );
}

/**
 * Find matching spec parameter by name (handles camelCase vs snake_case)
 */
function findMatchingSpecParam(implParamName: string, specParams: OpenAPIParam[]): OpenAPIParam | undefined {
  const camelCaseName = toCamelCase(implParamName);
  const withoutIdSuffix = implParamName.replace(/_id$/, '');
  const camelWithId = toCamelCase(withoutIdSuffix) + 'Id';
  
  return specParams.find(p => 
    p.name === implParamName ||           // Exact match
    p.name === camelCaseName ||           // snake_case -> camelCase
    p.name === camelWithId                // project_id -> projectId
  );
}

/**
 * Compare spec params with implementation params
 */
function compareParams(
  specParams: OpenAPIParam[],
  implParams: SchemaParam[]
): string[] {
  const issues: string[] = [];
  
  // Check body parameters
  for (const specParam of specParams) {
    if (specParam.in === 'body') {
      const implParam = findMatchingImplParam(specParam.name, implParams);
      
      if (!implParam) {
        if (specParam.required) {
          issues.push(`Missing required body parameter: ${specParam.name} (${specParam.type})`);
        } else {
          issues.push(`[Warning] Missing optional body parameter: ${specParam.name} (${specParam.type})`);
        }
      } else {
        // Check required mismatch
        if (specParam.required && !implParam.required) {
          issues.push(`Parameter ${specParam.name} should be required but is optional`);
        }
        
        // Check type mismatch (with normalization)
        const specType = normalizeType(specParam.type);
        const implType = normalizeType(implParam.type);
        if (specType !== implType) {
          issues.push(`Parameter ${specParam.name} type mismatch: spec=${specParam.type}, impl=${implParam.type}`);
        }
      }
    }
  }
  
  // Check path parameters (should always be required in implementation)
  for (const specParam of specParams) {
    if (specParam.in === 'path') {
      const implParam = findMatchingImplParam(specParam.name, implParams);
      
      if (!implParam) {
        issues.push(`Missing path parameter: ${specParam.name}`);
      } else if (!implParam.required) {
        issues.push(`Path parameter ${specParam.name} should be required but is optional`);
      }
    }
  }
  
  // Check query parameters
  for (const specParam of specParams) {
    if (specParam.in === 'query') {
      const implParam = findMatchingImplParam(specParam.name, implParams);
      if (!implParam && specParam.required) {
        issues.push(`Missing required query parameter: ${specParam.name}`);
      }
    }
  }
  
  // Check for extra required parameters not in spec
  for (const implParam of implParams) {
    // Skip common internal parameters
    if (['response_format'].includes(implParam.name)) continue;
    
    const specParam = findMatchingSpecParam(implParam.name, specParams);
    if (!specParam && implParam.required) {
      issues.push(`Extra required parameter not in spec: ${implParam.name}`);
    }
  }
  
  return issues;
}

/**
 * Main analysis function
 */
function analyzeAllSpecs(): EndpointAnalysis[] {
  const docsDir = join(process.cwd(), 'holded_docs');
  const files = readdirSync(docsDir).filter(f => f.endsWith('.md'));
  
  const analyses: EndpointAnalysis[] = [];
  
  for (const file of files) {
    const filePath = join(docsDir, file);
    const spec = extractOpenAPISpec(filePath);
    
    if (!spec) continue;
    
    const toolName = findToolName(spec.path, spec.method);
    let implParams: SchemaParam[] = [];
    
    if (toolName) {
      const schemaInfo = findSchemaFile(toolName);
      if (schemaInfo) {
        implParams = extractSchemaParams(schemaInfo.path, schemaInfo.schemaName);
      }
    }
    
    const issues = compareParams(spec.parameters, implParams);
    
    analyses.push({
      file,
      endpoint: spec.path,
      method: spec.method,
      toolName,
      specParams: spec.parameters,
      implParams,
      issues,
      status: toolName 
        ? (issues.length > 0 ? 'mismatch' : 'match')
        : 'not_implemented',
    });
  }
  
  return analyses;
}

// Run analysis
const analyses = analyzeAllSpecs();

console.log(`Analyzed ${analyses.length} endpoints`);
console.log(`Matches: ${analyses.filter(a => a.status === 'match').length}`);
console.log(`Mismatches: ${analyses.filter(a => a.status === 'mismatch').length}`);
console.log(`Not implemented: ${analyses.filter(a => a.status === 'not_implemented').length}`);

// Output detailed report
for (const analysis of analyses) {
  if (analysis.issues.length > 0) {
    console.log(`\n${analysis.endpoint} [${analysis.method}]:`);
    for (const issue of analysis.issues) {
      console.log(`  - ${issue}`);
    }
  }
}

export { analyzeAllSpecs, extractOpenAPISpec, compareParams, analyses };
