/**
 * Daily Ledger tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, toStructuredContent } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import { DailyLedgerEntry } from "../../types.js";
import { withErrorHandling } from "../utilities.js";
import {
  ListDailyLedgerInputSchema,
  CreateEntryInputSchema,
  ListDailyLedgerInput,
  CreateEntryInput,
} from "../../schemas/accounting/daily-ledger.js";
import { resolveTimestamps } from "../../utils/timezone.js";

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

Args (default mode — recommended):
  - start_date (string): Period start date in YYYY-MM-DD format
  - end_date (string): Period end date in YYYY-MM-DD format (inclusive)

Args (raw timestamp mode — set raw_timestamps: true):
  - starttmp (number): Starting Unix timestamp (CET-aligned recommended)
  - endtmp (number): Ending Unix timestamp (CET-aligned recommended)
  - raw_timestamps (boolean): Must be true to use timestamp mode

Additional args:
  - page (number): Page number for pagination (default: 1, max 250 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Note: Dates are interpreted in Spanish local time (CET/CEST). The API uses a half-open interval [starttmp, endtmp). Pagination order is non-deterministic.

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
    withErrorHandling(async (params) => {
      const typedParams = params as unknown as ListDailyLedgerInput;

      // Resolve dates to timestamps
      const { starttmp, endtmp } = resolveTimestamps(typedParams);

      const queryParams: Record<string, unknown> = { starttmp, endtmp };
      if (typedParams.page > 1) {
        queryParams.page = typedParams.page;
      }

      const entries = await makeApiRequest<DailyLedgerEntry[]>(
        "accounting",
        "dailyledger",
        "GET",
        undefined,
        queryParams
      );

      let textContent: string;
      if (typedParams.response_format === ResponseFormat.MARKDOWN) {
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
        structuredContent: { entries, count: entries.length, page: typedParams.page },
      };
    })
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
    withErrorHandling(async (params) => {
      const typedParams = params as unknown as CreateEntryInput;
      const response = await makeApiRequest<unknown>(
        "accounting",
        "entry",
        "POST",
        typedParams
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
    })
  );
}
