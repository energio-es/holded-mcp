/**
 * Remittance tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ListRemittancesInputSchema,
  GetRemittanceInputSchema,
} from "../../schemas/invoicing/remittances.js";
import { registerCrudTools } from "../factory.js";

/**
 * Format remittances as markdown
 */
function formatRemittancesMarkdown(remittances: Record<string, unknown>[]): string {
  if (!remittances.length) {
    return "No remittances found.";
  }

  const lines = ["# Remittances", "", `Found ${remittances.length} remittances:`, ""];

  for (const remittance of remittances) {
    lines.push(`## Remittance ${remittance.id}`);
    lines.push(`- **ID**: ${remittance.id}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single remittance as markdown
 */
function formatRemittanceMarkdown(remittance: Record<string, unknown>): string {
  const lines = [`# Remittance ${remittance.id || "Unknown"}`, ""];

  for (const [key, value] of Object.entries(remittance)) {
    if (value !== null && value !== undefined) {
      lines.push(`- **${key}**: ${String(value)}`);
    }
  }

  return lines.join("\n");
}

/**
 * Register remittance tools
 */
export function registerRemittanceTools(server: McpServer): void {
  registerCrudTools<Record<string, unknown>>(server, {
    module: "invoicing",
    toolPrefix: "holded_invoicing",
    resource: "remittance",
    resourcePlural: "remittances",
    endpoint: "remittances",
    idParam: "remittance_id",
    schemas: {
      list: ListRemittancesInputSchema,
      get: GetRemittanceInputSchema,
    },
    titles: {
      list: "List Holded Remittances",
      get: "Get Holded Remittance",
    },
    descriptions: {
      list: `List all remittances from Holded.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of remittances.`,
      get: `Get a specific remittance by ID from Holded.

Args:
  - remittance_id (string): The remittance ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Remittance details.`,
    },
    formatters: {
      list: formatRemittancesMarkdown,
      single: formatRemittanceMarkdown,
    },
  });
}
