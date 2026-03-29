/**
 * Expenses Account tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError, toStructuredContent } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import {
  ListExpensesAccountsInputSchema,
  GetExpensesAccountInputSchema,
  CreateExpensesAccountInputSchema,
  UpdateExpensesAccountInputSchema,
  DeleteExpensesAccountInputSchema,
  ListExpensesAccountsInput,
  GetExpensesAccountInput,
  CreateExpensesAccountInput,
  UpdateExpensesAccountInput,
  DeleteExpensesAccountInput,
} from "../../schemas/invoicing/expenses-accounts.js";

interface ExpensesAccount {
  id: string;
  name: string;
  code?: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Format expenses accounts as markdown
 */
function formatExpensesAccountsMarkdown(accounts: ExpensesAccount[]): string {
  if (!accounts.length) {
    return "No expenses accounts found.";
  }

  const lines = ["# Expenses Accounts", "", `Found ${accounts.length} expenses accounts:`, ""];

  for (const account of accounts) {
    lines.push(`## ${account.name}`);
    lines.push(`- **ID**: ${account.id}`);
    if (account.code) lines.push(`- **Code**: ${account.code}`);
    if (account.description) lines.push(`- **Description**: ${account.description}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single expenses account as markdown
 */
function formatExpensesAccountMarkdown(account: ExpensesAccount): string {
  const lines = [`# ${account.name}`, "", `**ID**: ${account.id}`, ""];
  if (account.code) lines.push(`- **Code**: ${account.code}`);
  if (account.description) lines.push(`- **Description**: ${account.description}`);

  return lines.join("\n");
}

/**
 * Register all expenses account-related tools
 */
export function registerExpensesAccountTools(server: McpServer): void {
  // List Expenses Accounts
  server.registerTool(
    "holded_invoicing_list_expenses_accounts",
    {
      title: "List Holded Expenses Accounts",
      description: `List all expenses accounts from Holded.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of expenses accounts with id, name, code, and description.`,
      inputSchema: ListExpensesAccountsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListExpensesAccountsInput) => {
      try {
        const queryParams: Record<string, unknown> = {};
        if (params.page > 1) {
          queryParams.page = params.page;
        }

        const accounts = await makeApiRequest<ExpensesAccount[]>(
          "invoicing",
          "expensesaccounts",
          "GET",
          undefined,
          queryParams
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatExpensesAccountsMarkdown(accounts)
            : JSON.stringify(accounts, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { expensesAccounts: accounts, count: accounts.length, page: params.page },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Get Expenses Account
  server.registerTool(
    "holded_invoicing_get_expenses_account",
    {
      title: "Get Holded Expenses Account",
      description: `Get a specific expenses account by ID from Holded.

Args:
  - expenses_account_id (string): The expenses account ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Expenses account details including name, code, and description.`,
      inputSchema: GetExpensesAccountInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetExpensesAccountInput) => {
      try {
        const account = await makeApiRequest<ExpensesAccount>(
          "invoicing",
          `expensesaccounts/${params.expenses_account_id}`,
          "GET"
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatExpensesAccountMarkdown(account)
            : JSON.stringify(account, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: toStructuredContent(account),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Create Expenses Account
  server.registerTool(
    "holded_invoicing_create_expenses_account",
    {
      title: "Create Holded Expenses Account",
      description: `Create a new expenses account in Holded.

Args:
  - name (string): Expenses account name (required)
  - code (string): Account code
  - description (string): Account description

Returns:
  The created expenses account with its assigned ID.`,
      inputSchema: CreateExpensesAccountInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateExpensesAccountInput) => {
      try {
        const account = await makeApiRequest<ExpensesAccount>(
          "invoicing",
          "expensesaccounts",
          "POST",
          params
        );

        return {
          content: [
            {
              type: "text",
              text: `Expenses account created successfully.\n\n${JSON.stringify(account, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(account),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Update Expenses Account
  server.registerTool(
    "holded_invoicing_update_expenses_account",
    {
      title: "Update Holded Expenses Account",
      description: `Update an existing expenses account in Holded.

Args:
  - expenses_account_id (string): The expenses account ID to update (required)
  - name (string): Expenses account name
  - code (string): Account code
  - description (string): Account description

Returns:
  The updated expenses account.`,
      inputSchema: UpdateExpensesAccountInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: UpdateExpensesAccountInput) => {
      try {
        const { expenses_account_id, ...updateData } = params;
        const account = await makeApiRequest<ExpensesAccount>(
          "invoicing",
          `expensesaccounts/${expenses_account_id}`,
          "PUT",
          updateData
        );

        return {
          content: [
            {
              type: "text",
              text: `Expenses account updated successfully.\n\n${JSON.stringify(account, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(account),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Delete Expenses Account
  server.registerTool(
    "holded_invoicing_delete_expenses_account",
    {
      title: "Delete Holded Expenses Account",
      description: `Delete an expenses account from Holded.

Args:
  - expenses_account_id (string): The expenses account ID to delete (required)

Returns:
  Confirmation of deletion.`,
      inputSchema: DeleteExpensesAccountInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: DeleteExpensesAccountInput) => {
      try {
        await makeApiRequest<void>(
          "invoicing",
          `expensesaccounts/${params.expenses_account_id}`,
          "DELETE"
        );

        return {
          content: [
            {
              type: "text",
              text: `Expenses account ${params.expenses_account_id} deleted successfully.`,
            },
          ],
          structuredContent: { deleted: true, id: params.expenses_account_id },
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
