/**
 * Services tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ListServicesInputSchema,
  GetServiceInputSchema,
  CreateServiceInputSchema,
  UpdateServiceInputSchema,
  DeleteServiceInputSchema,
} from "../../schemas/invoicing/services.js";
import { registerCrudTools } from "../factory.js";

interface Service {
  id: string;
  name: string;
  desc?: string;
  subtotal?: number;
  tax?: number;
  cost?: number;
  salesChannelId?: string;
  tags?: string[];
  [key: string]: unknown;
}

/**
 * Format services as markdown
 */
export function formatServicesMarkdown(services: Service[]): string {
  if (!services.length) {
    return "No services found.";
  }

  const lines = ["# Services", "", `Found ${services.length} services:`, ""];

  for (const service of services) {
    lines.push(`## ${service.name}`);
    lines.push(`- **ID**: ${service.id}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single service as markdown
 */
export function formatServiceMarkdown(service: Service): string {
  const lines = [`# ${service.name || "Service"}`, "", `**ID**: ${service.id}`, ""];

  if (service.desc) lines.push(`- **Description**: ${service.desc}`);
  if (service.subtotal !== undefined) lines.push(`- **Subtotal**: ${service.subtotal}`);
  if (service.tax !== undefined) lines.push(`- **Tax**: ${service.tax}`);
  if (service.cost !== undefined) lines.push(`- **Cost**: ${service.cost}`);
  if (service.salesChannelId) lines.push(`- **Sales Channel ID**: ${service.salesChannelId}`);
  if (service.tags && Array.isArray(service.tags) && service.tags.length > 0) {
    lines.push(`- **Tags**: ${service.tags.join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Register services tools
 */
export function registerServicesTools(server: McpServer): void {
  registerCrudTools<Service>(server, {
    module: "invoicing",
    toolPrefix: "holded_invoicing",
    resource: "service",
    resourcePlural: "services",
    endpoint: "services",
    idParam: "service_id",
    schemas: {
      list: ListServicesInputSchema,
      get: GetServiceInputSchema,
      create: CreateServiceInputSchema,
      update: UpdateServiceInputSchema,
      delete: DeleteServiceInputSchema,
    },
    titles: {
      list: "List Holded Services",
      get: "Get Holded Service",
      create: "Create Holded Service",
      update: "Update Holded Service",
      delete: "Delete Holded Service",
    },
    descriptions: {
      list: `List all services from Holded.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of services with id and name.`,
      get: `Get a specific service by ID from Holded.

Args:
  - service_id (string): The service ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Service details including name, description, price, and other fields.`,
      create: `Create a new service in Holded.

Args:
  - name (string): Service name (required)
  - desc (string): Service description
  - tags (array): Service tags
  - tax (number): Tax rate
  - subtotal (number): Subtotal in cents
  - salesChannelId (string): Sales channel ID
  - cost (number): Service cost

Returns:
  The created service with its assigned ID.`,
      update: `Update an existing service in Holded. Only provided fields will be updated.

Args:
  - service_id (string): The service ID to update (required)
  - name (string): Service name
  - desc (string): Service description
  - tags (array): Service tags
  - tax (number): Tax rate
  - subtotal (number): Subtotal in cents
  - salesChannelId (string): Sales channel ID
  - cost (number): Service cost

Returns:
  The updated service.`,
      delete: `Delete a service from Holded.

Args:
  - service_id (string): The service ID to delete (required)

Returns:
  Confirmation of deletion.`,
    },
    formatters: {
      list: formatServicesMarkdown,
      single: formatServiceMarkdown,
    },
  });
}
