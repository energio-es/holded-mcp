/**
 * Accounting Account tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AccountingAccount } from "../../types.js";
import {
  ListAccountingAccountsInputSchema,
  CreateAccountInputSchema,
} from "../../schemas/accounting/accounts.js";
import { registerCrudTools } from "../factory.js";
import { resolveTimestamps } from "../../utils/timezone.js";

/**
 * Format accounting accounts as markdown
 */
export function formatAccountingAccountsMarkdown(accounts: AccountingAccount[]): string {
  if (!accounts.length) {
    return "No accounting accounts found.";
  }

  const lines = ["# Accounting Accounts", "", `Found ${accounts.length} accounts:`, ""];

  for (const account of accounts) {
    lines.push(`## ${account.name}`);
    lines.push(`- **ID**: ${account.id}`);
    lines.push(`- **Num**: ${account.num}`);
    lines.push(`- **Group**: ${account.group}`);
    if (account.debit !== undefined) lines.push(`- **Debit**: ${account.debit}`);
    if (account.credit !== undefined) lines.push(`- **Credit**: ${account.credit}`);
    if (account.balance !== undefined) lines.push(`- **Balance**: ${account.balance}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Register all accounting account-related tools
 */
export function registerAccountTools(server: McpServer): void {
  registerCrudTools<AccountingAccount>(server, {
    module: "accounting",
    toolPrefix: "holded_accounting",
    resource: "account",
    resourcePlural: "accounts",
    endpoint: "account",
    listEndpoint: "chartofaccounts",
    idParam: "account_id",
    schemas: {
      list: ListAccountingAccountsInputSchema,
      create: CreateAccountInputSchema,
    },
    titles: {
      list: "List Holded Accounting Accounts",
      create: "Create Holded Accounting Account",
    },
    descriptions: {
      list: `List all accounting accounts (chart of accounts/PGC accounts) from Holded.

Returns accounts with debit/credit/balance totals scoped to the current fiscal year by default. Pass start_date/end_date to query a different period.

For date-scoped account balances computed from individual daily ledger entries, use holded_accounting_list_account_balances instead.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'json')
  - include_empty (boolean): Include accounts with zero balance (API default: false)
  - start_date (string): Period start date in YYYY-MM-DD format (optional, omit for current fiscal year)
  - end_date (string): Period end date in YYYY-MM-DD format (optional, inclusive)
  - raw_timestamps (boolean): Set to true to use starttmp/endtmp instead of start_date/end_date
  - starttmp (number): Period start as Unix timestamp (raw_timestamps mode only)
  - endtmp (number): Period end as Unix timestamp (raw_timestamps mode only)

Returns:
  Array of accounting accounts with id, num, name, group, color, debit, credit, and balance.`,
      create: `Create a new accounting account in Holded.

The prefix parameter takes a 4-digit integer that matches the prefix of the corresponding account in Holded.
The API will create an account at the next available number under this prefix.

Example: 7000 -> 70000001 (Sales)

Args:
  - prefix (number): 4-digit prefix for the account code (required, e.g., 7000 for sales)
  - name (string): Account name (uses parent account name if not provided)
  - color (string): Account color as hex code (e.g., #FF0000)

Returns:
  The created accounting account with its assigned code.`,
    },
    formatters: {
      list: formatAccountingAccountsMarkdown,
      single: () => "",
    },
    listQueryParams: (params) => {
      const qp: Record<string, unknown> = {};
      if (params.include_empty !== undefined) qp.includeEmpty = params.include_empty ? 1 : 0;
      if ((params.start_date && params.end_date) || params.raw_timestamps) {
        const { starttmp, endtmp } = resolveTimestamps(params as {
          raw_timestamps: boolean;
          starttmp?: number;
          endtmp?: number;
          start_date?: string;
          end_date?: string;
        });
        qp.starttmp = starttmp;
        qp.endtmp = endtmp;
      }
      return qp;
    },
  });
}
