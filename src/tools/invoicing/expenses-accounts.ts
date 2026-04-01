/**
 * Expenses Account tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ListExpensesAccountsInputSchema,
  GetExpensesAccountInputSchema,
  CreateExpensesAccountInputSchema,
  UpdateExpensesAccountInputSchema,
  DeleteExpensesAccountInputSchema,
} from "../../schemas/invoicing/expenses-accounts.js";
import { registerCrudTools } from "../factory.js";

interface ExpensesAccount {
  id: string;
  name: string;
  color?: string;
  accountNum?: number;
  [key: string]: unknown;
}

/**
 * Format expenses accounts as markdown
 */
export function formatExpensesAccountsMarkdown(accounts: ExpensesAccount[]): string {
  if (!accounts.length) {
    return "No expenses accounts found.";
  }

  const lines = ["# Expenses Accounts", "", `Found ${accounts.length} expenses accounts:`, ""];

  for (const account of accounts) {
    lines.push(`## ${account.name}`);
    lines.push(`- **ID**: ${account.id}`);
    if (account.accountNum !== undefined) lines.push(`- **Account Number**: ${account.accountNum}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single expenses account as markdown
 */
export function formatExpensesAccountMarkdown(account: ExpensesAccount): string {
  const lines = [`# ${account.name}`, "", `**ID**: ${account.id}`, ""];
  if (account.accountNum !== undefined) lines.push(`- **Account Number**: ${account.accountNum}`);

  return lines.join("\n");
}

/**
 * Register all expenses account-related tools
 */
export function registerExpensesAccountTools(server: McpServer): void {
  registerCrudTools<ExpensesAccount>(server, {
    module: "invoicing",
    toolPrefix: "holded_invoicing",
    resource: "expenses_account",
    resourcePlural: "expenses_accounts",
    endpoint: "expensesaccounts",
    idParam: "expenses_account_id",
    schemas: {
      list: ListExpensesAccountsInputSchema,
      get: GetExpensesAccountInputSchema,
      create: CreateExpensesAccountInputSchema,
      update: UpdateExpensesAccountInputSchema,
      delete: DeleteExpensesAccountInputSchema,
    },
    titles: {
      list: "List Holded Expenses Accounts",
      get: "Get Holded Expenses Account",
      create: "Create Holded Expenses Account",
      update: "Update Holded Expenses Account",
      delete: "Delete Holded Expenses Account",
    },
    descriptions: {
      list: `List all expenses accounts from Holded.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of expenses accounts with id, name, code, and description.`,
      get: `Get a specific expenses account by ID from Holded.

Args:
  - expenses_account_id (string): The expenses account ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Expenses account details including name, code, and description.`,
      create: `Create a new expenses account in Holded.

Args:
  - name (string): Expenses account name (required)
  - code (string): Account code
  - description (string): Account description

Returns:
  The created expenses account with its assigned ID.`,
      update: `Update an existing expenses account in Holded.

Args:
  - expenses_account_id (string): The expenses account ID to update (required)
  - name (string): Expenses account name
  - code (string): Account code
  - description (string): Account description

Returns:
  The updated expenses account.`,
      delete: `Delete an expenses account from Holded.

Args:
  - expenses_account_id (string): The expenses account ID to delete (required)

Returns:
  Confirmation of deletion.`,
    },
    formatters: {
      list: formatExpensesAccountsMarkdown,
      single: formatExpensesAccountMarkdown,
    },
  });
}
