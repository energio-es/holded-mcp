/**
 * Remittance tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError, toStructuredContent } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import {
  ListRemittancesInputSchema,
  GetRemittanceInputSchema,
  ListRemittancesInput,
  GetRemittanceInput,
} from "../../schemas/invoicing/remittances.js";

/**
 * Format remittances as markdown
 */
function formatRemittancesMarkdown(remittances: Array<{ id: string; [key: string]: unknown }>): string {
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
  // List Remittances
  server.registerTool(
    "holded_invoicing_list_remittances",
    {
      title: "List Holded Remittances",
      description: `List all remittances from Holded.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of remittances.`,
      inputSchema: ListRemittancesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListRemittancesInput) => {
      try {
        const queryParams: Record<string, unknown> = {};
        if (params.page > 1) {
          queryParams.page = params.page;
        }

        const remittances = await makeApiRequest<Array<{ id: string; [key: string]: unknown }>>(
          "invoicing",
          "remittances",
          "GET",
          undefined,
          queryParams
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatRemittancesMarkdown(remittances)
            : JSON.stringify(remittances, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { remittances, count: remittances.length, page: params.page },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Get Remittance
  server.registerTool(
    "holded_invoicing_get_remittance",
    {
      title: "Get Holded Remittance",
      description: `Get a specific remittance by ID from Holded.

Args:
  - remittance_id (string): The remittance ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Remittance details.`,
      inputSchema: GetRemittanceInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetRemittanceInput) => {
      try {
        const remittance = await makeApiRequest<Record<string, unknown>>(
          "invoicing",
          `remittances/${params.remittance_id}`,
          "GET"
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatRemittanceMarkdown(remittance)
            : JSON.stringify(remittance, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: toStructuredContent(remittance),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );
}
