/**
 * Taxes tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import { withErrorHandling } from "../utilities.js";
import {
  GetTaxesInputSchema,
  GetTaxesInput,
} from "../../schemas/invoicing/taxes.js";

/**
 * Format taxes as markdown
 */
export function formatTaxesMarkdown(taxes: Array<{ key: string; name: string; amount?: number; [key: string]: unknown }>): string {
  if (!taxes.length) {
    return "No taxes found.";
  }

  const lines = ["# Taxes", "", `Found ${taxes.length} taxes:`, ""];

  for (const tax of taxes) {
    lines.push(`## ${tax.name}`);
    lines.push(`- **Key**: ${tax.key}`);
    if (tax.amount !== undefined) lines.push(`- **Amount**: ${tax.amount}%`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Register taxes tools
 */
export function registerTaxesTools(server: McpServer): void {
  // Get Taxes
  server.registerTool(
    "holded_invoicing_get_taxes",
    {
      title: "Get Holded Taxes",
      description: `Get all taxes information from Holded.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of taxes with id, name, and rate information.`,
      inputSchema: GetTaxesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { response_format } = params as unknown as GetTaxesInput;
      const taxes = await makeApiRequest<Array<{ key: string; name: string; amount?: number; [key: string]: unknown }>>(
        "invoicing",
        "taxes",
        "GET"
      );

      const textContent =
        response_format === ResponseFormat.MARKDOWN
          ? formatTaxesMarkdown(taxes)
          : JSON.stringify(taxes, null, 2);

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: { taxes, count: taxes.length },
      };
    })
  );
}
