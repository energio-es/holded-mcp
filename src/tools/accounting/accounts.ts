/**
 * Accounting Account tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError, toStructuredContent } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import { AccountingAccount } from "../../types.js";
import {
  ListAccountingAccountsInputSchema,
  CreateAccountInputSchema,
  GetAccountInputSchema,
  UpdateAccountInputSchema,
  DeleteAccountInputSchema,
  ListAccountingAccountsInput,
  CreateAccountInput,
  GetAccountInput,
  UpdateAccountInput,
  DeleteAccountInput,
} from "../../schemas/accounting/accounts.js";

/**
 * Format accounting accounts as markdown
 */
function formatAccountingAccountsMarkdown(accounts: AccountingAccount[]): string {
  if (!accounts.length) {
    return "No accounting accounts found.";
  }

  const lines = ["# Accounting Accounts", "", `Found ${accounts.length} accounts:`, ""];

  for (const account of accounts) {
    lines.push(`## ${account.name}`);
    lines.push(`- **ID**: ${account.id}`);
    lines.push(`- **Code**: ${account.code}`);
    if (account.type) lines.push(`- **Type**: ${account.type}`);
    if (account.parentId) lines.push(`- **Parent ID**: ${account.parentId}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single accounting account as markdown
 */
function formatAccountingAccountMarkdown(account: AccountingAccount): string {
  const lines = [`# ${account.name}`, "", `**ID**: ${account.id}`, ""];
  lines.push(`- **Code**: ${account.code}`);
  if (account.type) lines.push(`- **Type**: ${account.type}`);
  if (account.parentId) lines.push(`- **Parent ID**: ${account.parentId}`);

  return lines.join("\n");
}

/**
 * Register all accounting account-related tools
 */
export function registerAccountTools(server: McpServer): void {
  // List Accounting Accounts
  server.registerTool(
    "holded_accounting_list_accounts",
    {
      title: "List Holded Accounting Accounts",
      description: `List all accounting accounts (chart of accounts/PGC accounts) from Holded.

Returns paginated list of accounting accounts. Use page parameter to navigate through results.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')
  - include_empty (boolean): Include empty accounts in the results (default: true)
  - starttmp (number): Starting timestamp as Unix timestamp (optional, filters by account activity date)
  - endtmp (number): Ending timestamp as Unix timestamp (optional, filters by account activity date)

Note: When using starttmp/endtmp, the returned debit/credit/balance totals may include entries from outside the requested date range due to a known Holded API limitation. For accurate date-scoped totals, use holded_accounting_account_balances instead.

Returns:
  Array of accounting accounts with id, code, name, type, and parent account information.`,
      inputSchema: ListAccountingAccountsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListAccountingAccountsInput) => {
      try {
        const queryParams: Record<string, unknown> = {};
        if (params.page > 1) {
          queryParams.page = params.page;
        }
        // Include empty accounts parameter (as per Holded API documentation)
        // API expects 0 or 1, not boolean
        if (params.include_empty !== undefined) {
          queryParams.includeEmpty = params.include_empty ? 1 : 0;
        }
        // Date filtering parameters
        if (params.starttmp !== undefined) {
          queryParams.starttmp = params.starttmp;
        }
        if (params.endtmp !== undefined) {
          queryParams.endtmp = params.endtmp;
        }

        const accounts = await makeApiRequest<AccountingAccount[]>(
          "accounting",
          "chartofaccounts",
          "GET",
          undefined,
          queryParams
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatAccountingAccountsMarkdown(accounts)
            : JSON.stringify(accounts, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { accounts, count: accounts.length, page: params.page },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Create Accounting Account
  server.registerTool(
    "holded_accounting_create_account",
    {
      title: "Create Holded Accounting Account",
      description: `Create a new accounting account in Holded.

The prefix parameter takes a 4-digit integer that matches the prefix of the corresponding account in Holded.
The API will create an account at the next available number under this prefix.

Example: 7000 -> 70000001 (Sales)

Args:
  - prefix (number): 4-digit prefix for the account code (required, e.g., 7000 for sales)
  - name (string): Account name (uses parent account name if not provided)
  - color (string): Account color as hex code (e.g., #FF0000)

Returns:
  The created accounting account with its assigned code.`,
      inputSchema: CreateAccountInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateAccountInput) => {
      try {
        const account = await makeApiRequest<AccountingAccount>(
          "accounting",
          "account",
          "POST",
          params
        );

        return {
          content: [
            {
              type: "text",
              text: `Accounting account created successfully.\n\n${JSON.stringify(account, null, 2)}`,
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

  // Get Accounting Account
  server.registerTool(
    "holded_accounting_get_account",
    {
      title: "Get Holded Accounting Account",
      description: `Get a specific accounting account by ID from Holded.

Args:
  - account_id (string): The accounting account ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Accounting account details including code, name, type, and parent account.`,
      inputSchema: GetAccountInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetAccountInput) => {
      try {
        const account = await makeApiRequest<AccountingAccount>(
          "accounting",
          `account/${params.account_id}`,
          "GET"
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatAccountingAccountMarkdown(account)
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

  // Update Accounting Account
  server.registerTool(
    "holded_accounting_update_account",
    {
      title: "Update Holded Accounting Account",
      description: `Update an existing accounting account in Holded.

Args:
  - account_id (string): The accounting account ID to update (required)
  - name (string): Account name
  - code (string): Account code
  - type (string): Account type
  - parentId (string): Parent account ID

Returns:
  The updated accounting account.`,
      inputSchema: UpdateAccountInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: UpdateAccountInput) => {
      try {
        const { account_id, ...updateData } = params;
        const account = await makeApiRequest<AccountingAccount>(
          "accounting",
          `account/${account_id}`,
          "PUT",
          updateData
        );

        return {
          content: [
            {
              type: "text",
              text: `Accounting account updated successfully.\n\n${JSON.stringify(account, null, 2)}`,
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

  // Delete Accounting Account
  server.registerTool(
    "holded_accounting_delete_account",
    {
      title: "Delete Holded Accounting Account",
      description: `Delete an accounting account from Holded.

Args:
  - account_id (string): The accounting account ID to delete (required)

Returns:
  Confirmation of deletion.`,
      inputSchema: DeleteAccountInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: DeleteAccountInput) => {
      try {
        await makeApiRequest<void>(
          "accounting",
          `account/${params.account_id}`,
          "DELETE"
        );

        return {
          content: [
            {
              type: "text",
              text: `Accounting account ${params.account_id} deleted successfully.`,
            },
          ],
          structuredContent: { deleted: true, id: params.account_id },
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
