/**
 * Daily Ledger tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError, toStructuredContent } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import { DailyLedgerEntry } from "../../types.js";
import {
  ListDailyLedgerInputSchema,
  CreateEntryInputSchema,
  ListDailyLedgerInput,
  CreateEntryInput,
} from "../../schemas/accounting/daily-ledger.js";

/**
 * Register all daily ledger-related tools
 */
export function registerDailyLedgerTools(server: McpServer): void {
  // List Daily Ledger Entries
  server.registerTool(
    "holded_accounting_list_daily_ledger",
    {
      title: "List Holded Daily Ledger Entries",
      description: `List daily ledger entries from Holded Accounting.

Args:
  - starttmp (number): Starting timestamp as Unix timestamp (optional, filters entries from this date)
  - endtmp (number): Ending timestamp as Unix timestamp (optional, filters entries until this date)
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of daily ledger entries with date, account, amount, and description.`,
      inputSchema: ListDailyLedgerInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListDailyLedgerInput) => {
      try {
        const queryParams: Record<string, unknown> = {};
        if (params.starttmp !== undefined) {
          queryParams.starttmp = params.starttmp;
        }
        if (params.endtmp !== undefined) {
          queryParams.endtmp = params.endtmp;
        }
        if (params.page > 1) {
          queryParams.page = params.page;
        }

        const entries = await makeApiRequest<DailyLedgerEntry[]>(
          "accounting",
          "dailyledger",
          "GET",
          undefined,
          queryParams
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          if (!entries.length) {
            textContent = "No daily ledger entries found.";
          } else {
            const lines = ["# Daily Ledger Entries", "", `Found ${entries.length} entries:`, ""];
            for (const entry of entries) {
              lines.push(`## Entry ${entry.id}`);
              lines.push(`- **ID**: ${entry.id}`);
              lines.push(`- **Date**: ${new Date(entry.date * 1000).toLocaleDateString()}`);
              lines.push(`- **Account**: ${entry.account}`);
              lines.push(`- **Amount**: ${entry.amount}`);
              if (entry.description) lines.push(`- **Description**: ${entry.description}`);
              lines.push("");
            }
            textContent = lines.join("\n");
          }
        } else {
          textContent = JSON.stringify(entries, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { entries, count: entries.length, page: params.page },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Create Daily Ledger Entry
  server.registerTool(
    "holded_accounting_create_entry",
    {
      title: "Create Holded Daily Ledger Entry",
      description: `Create a new daily ledger entry in Holded Accounting.

Args:
  - date (number): Entry date as Unix timestamp (required)
  - lines (array): Array of entry lines, minimum 2 lines required (required)
    Each line object contains:
    - account (number): Accounting account number as integer (required)
    - debit (number): Debit amount (optional, cannot have both debit and credit)
    - credit (number): Credit amount (optional, cannot have both debit and credit)
    - description (string): Line description (optional)
    - tags (array): Array of tags for this entry line (optional)
  - notes (string): Entry note (optional)

Requirements:
  - At least 2 entry lines are required
  - Each line must have either debit or credit (not both)
  - Total debits must equal total credits
  - Account numbers must match existing accounting accounts

Returns:
  The created daily ledger entry with its assigned ID.`,
      inputSchema: CreateEntryInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateEntryInput) => {
      try {
        const response = await makeApiRequest<unknown>(
          "accounting",
          "entry",
          "POST",
          params
        );

        return {
          content: [
            {
              type: "text",
              text: `Daily ledger entry created successfully.\n\n${JSON.stringify(response, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(response),
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
