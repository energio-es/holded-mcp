/**
 * Shared utilities for tool handlers
 */

import { ResponseFormat } from "../constants.js";
import { handleApiError, toStructuredContent } from "../services/api.js";

/**
 * Build a standard tool response with both text and structured content.
 *
 * @param data - The response data
 * @param format - MARKDOWN or JSON
 * @param formatter - Function that renders data as markdown text
 * @returns MCP tool result with content and structuredContent
 */
export function buildToolResponse<T>(
  data: T,
  format: ResponseFormat,
  formatter: (data: T) => string,
): { content: { type: "text"; text: string }[]; structuredContent: Record<string, unknown> } {
  const text =
    format === ResponseFormat.MARKDOWN
      ? formatter(data)
      : JSON.stringify(data, null, 2);

  return {
    content: [{ type: "text", text }],
    structuredContent: toStructuredContent(data),
  };
}

/**
 * Tool result type returned by MCP tool handlers.
 */
export interface ToolResult {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

/**
 * Wrap a tool handler in try/catch error handling.
 *
 * On success returns the handler's result.
 * On error returns a user-friendly error message with isError: true.
 */
export function withErrorHandling(
  handler: (params: Record<string, unknown>) => Promise<ToolResult>,
): (params: Record<string, unknown>) => Promise<ToolResult> {
  return async (params: Record<string, unknown>): Promise<ToolResult> => {
    try {
      return await handler(params);
    } catch (error) {
      return {
        content: [{ type: "text", text: handleApiError(error) }],
        isError: true,
      };
    }
  };
}

/**
 * Convert top-level snake_case keys to camelCase.
 * Does NOT recurse into nested objects.
 * Preserves keys that are already camelCase.
 */
export function snakeToCamel(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}
