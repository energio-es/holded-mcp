/**
 * Treasury and Payment Methods tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError, toStructuredContent } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import { Treasury } from "../../types.js";
import {
  CreateTreasuryInputSchema,
  ListPaymentMethodsInputSchema,
  ListTreasuriesInputSchema,
  GetTreasuryInputSchema,
  CreateTreasuryInput,
  ListPaymentMethodsInput,
  ListTreasuriesInput,
  GetTreasuryInput,
} from "../../schemas/invoicing/treasury.js";

/**
 * Register all treasury and payment methods tools
 */
export function registerTreasuryTools(server: McpServer): void {
  // Create Treasury
  server.registerTool(
    "holded_invoicing_create_treasury",
    {
      title: "Create Holded Treasury Account",
      description: `Create a new treasury/bank account in Holded.

Args:
  - name (string): Treasury account name (required)
  - id (string): Treasury account ID (optional, auto-generated if not provided)
  - type (string): Account type (e.g., 'bank', 'cash', 'creditcard')
  - balance (integer): Initial balance
  - accountNumber (integer): Accounting account number. If blank, a new account with prefix 572 will be created
  - iban (string): Bank IBAN
  - swift (string): Bank SWIFT/BIC code
  - bank (string): Bank identifier
  - bankname (string): Bank name

Returns:
  The created treasury account with its assigned ID.`,
      inputSchema: CreateTreasuryInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateTreasuryInput) => {
      try {
        const treasury = await makeApiRequest<Treasury>(
          "invoicing",
          "treasury",
          "POST",
          params
        );

        return {
          content: [
            {
              type: "text",
              text: `Treasury account created successfully.\n\n${JSON.stringify(treasury, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(treasury),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // List Payment Methods
  server.registerTool(
    "holded_invoicing_list_payment_methods",
    {
      title: "List Holded Payment Methods",
      description: `List all payment methods from Holded.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of payment methods with id, name, and configuration.`,
      inputSchema: ListPaymentMethodsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListPaymentMethodsInput) => {
      try {
        const paymentMethods = await makeApiRequest<Array<{ id: string; name: string; [key: string]: unknown }>>(
          "invoicing",
          "paymentmethods",
          "GET"
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          if (!paymentMethods.length) {
            textContent = "No payment methods found.";
          } else {
            const lines = ["# Payment Methods", "", `Found ${paymentMethods.length} payment methods:`, ""];
            for (const method of paymentMethods) {
              lines.push(`- **${method.name}** (ID: ${method.id})`);
            }
            textContent = lines.join("\n");
          }
        } else {
          textContent = JSON.stringify(paymentMethods, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { paymentMethods, count: paymentMethods.length },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // List Treasuries
  server.registerTool(
    "holded_invoicing_list_treasuries",
    {
      title: "List Holded Treasury Accounts",
      description: `List all treasury/bank accounts from Holded.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of treasury accounts with id, name, type, currency, and balance.`,
      inputSchema: ListTreasuriesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListTreasuriesInput) => {
      try {
        const treasuries = await makeApiRequest<Treasury[]>(
          "invoicing",
          "treasury",
          "GET"
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          if (!treasuries.length) {
            textContent = "No treasury accounts found.";
          } else {
            const lines = ["# Treasury Accounts", "", `Found ${treasuries.length} accounts:`, ""];
            for (const t of treasuries) {
              lines.push(`## ${t.name}`);
              lines.push(`- **ID**: ${t.id}`);
              lines.push(`- **Type**: ${t.type}`);
              if (t.currency) lines.push(`- **Currency**: ${t.currency}`);
              if (t.balance !== undefined) lines.push(`- **Balance**: ${t.balance}`);
              if (t.accountNumber !== undefined) lines.push(`- **Account Number**: ${t.accountNumber}`);
              if (t.iban) lines.push(`- **IBAN**: ${t.iban}`);
              if (t.swift) lines.push(`- **SWIFT/BIC**: ${t.swift}`);
              lines.push("");
            }
            textContent = lines.join("\n");
          }
        } else {
          textContent = JSON.stringify(treasuries, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { treasuries, count: treasuries.length },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Get Treasury
  server.registerTool(
    "holded_invoicing_get_treasury",
    {
      title: "Get Holded Treasury Account",
      description: `Get a specific treasury/bank account by ID from Holded.

Args:
  - treasury_id (string): The treasury account ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Treasury account details including balance and bank information.`,
      inputSchema: GetTreasuryInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetTreasuryInput) => {
      try {
        const treasury = await makeApiRequest<Treasury>(
          "invoicing",
          `treasury/${params.treasury_id}`,
          "GET"
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines = [`# ${treasury.name}`, ""];
          lines.push(`- **ID**: ${treasury.id}`);
          lines.push(`- **Type**: ${treasury.type}`);
          if (treasury.currency) lines.push(`- **Currency**: ${treasury.currency}`);
          if (treasury.balance !== undefined) lines.push(`- **Balance**: ${treasury.balance}`);
          if (treasury.accountNumber !== undefined) lines.push(`- **Account Number**: ${treasury.accountNumber}`);
          if (treasury.iban) lines.push(`- **IBAN**: ${treasury.iban}`);
          if (treasury.swift) lines.push(`- **SWIFT/BIC**: ${treasury.swift}`);
          if (treasury.bank) lines.push(`- **Bank**: ${treasury.bank}`);
          if (treasury.bankname) lines.push(`- **Bank Name**: ${treasury.bankname}`);
          textContent = lines.join("\n");
        } else {
          textContent = JSON.stringify(treasury, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: toStructuredContent(treasury),
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
