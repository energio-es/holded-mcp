/**
 * Payment tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError, toStructuredContent } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import { Payment } from "../../types.js";
import {
  CreatePaymentInputSchema,
  ListPaymentsInputSchema,
  GetPaymentInputSchema,
  UpdatePaymentInputSchema,
  DeletePaymentInputSchema,
  CreatePaymentInput,
  ListPaymentsInput,
  GetPaymentInput,
  UpdatePaymentInput,
  DeletePaymentInput,
} from "../../schemas/invoicing/payments.js";

/**
 * Register all payment-related tools
 */
export function registerPaymentTools(server: McpServer): void {
  // Create Payment
  server.registerTool(
    "holded_invoicing_create_payment",
    {
      title: "Create Holded Payment",
      description: `Create a payment for a document in Holded.

Args:
  - doc_id (string): The document ID to apply the payment to (required)
  - amount (number): Payment amount (required)
  - date (number): Payment date as Unix timestamp
  - account_id (string): Treasury/Bank account ID
  - desc (string): Payment description

Returns:
  The created payment confirmation.`,
      inputSchema: CreatePaymentInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreatePaymentInput) => {
      try {
        const { doc_id, account_id, ...paymentData } = params;
        const requestData = {
          ...paymentData,
          ...(account_id ? { accountId: account_id } : {}),
        };

        const payment = await makeApiRequest<Payment>(
          "invoicing",
          "payments",
          "POST",
          { docId: doc_id, ...requestData }
        );

        return {
          content: [
            {
              type: "text",
              text: `Payment created successfully.\n\n${JSON.stringify(payment, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(payment),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // List Payments
  server.registerTool(
    "holded_invoicing_list_payments",
    {
      title: "List Holded Payments",
      description: `List all payments from Holded.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of payments with id, docId, amount, date, and account information.`,
      inputSchema: ListPaymentsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListPaymentsInput) => {
      try {
        const queryParams: Record<string, unknown> = {};
        if (params.page > 1) {
          queryParams.page = params.page;
        }

        const payments = await makeApiRequest<Payment[]>(
          "invoicing",
          "payments",
          "GET",
          undefined,
          queryParams
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          if (!payments.length) {
            textContent = "No payments found.";
          } else {
            const lines = ["# Payments", "", `Found ${payments.length} payments:`, ""];
            for (const payment of payments) {
              lines.push(`## Payment ${payment.id}`);
              lines.push(`- **ID**: ${payment.id}`);
              lines.push(`- **Document ID**: ${payment.docId}`);
              lines.push(`- **Amount**: ${payment.amount}`);
              lines.push(`- **Date**: ${new Date(payment.date * 1000).toLocaleDateString()}`);
              if (payment.accountId) lines.push(`- **Account ID**: ${payment.accountId}`);
              if (payment.desc) lines.push(`- **Description**: ${payment.desc}`);
              lines.push("");
            }
            textContent = lines.join("\n");
          }
        } else {
          textContent = JSON.stringify(payments, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { payments, count: payments.length, page: params.page },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Get Payment
  server.registerTool(
    "holded_invoicing_get_payment",
    {
      title: "Get Holded Payment",
      description: `Get a specific payment by ID from Holded.

Args:
  - payment_id (string): The payment ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Payment details including document ID, amount, date, and account information.`,
      inputSchema: GetPaymentInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetPaymentInput) => {
      try {
        const payment = await makeApiRequest<Payment>(
          "invoicing",
          `payments/${params.payment_id}`,
          "GET"
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines = [`# Payment ${payment.id}`, ""];
          lines.push(`- **ID**: ${payment.id}`);
          lines.push(`- **Document ID**: ${payment.docId}`);
          lines.push(`- **Amount**: ${payment.amount}`);
          lines.push(`- **Date**: ${new Date(payment.date * 1000).toLocaleDateString()}`);
          if (payment.accountId) lines.push(`- **Account ID**: ${payment.accountId}`);
          if (payment.desc) lines.push(`- **Description**: ${payment.desc}`);
          textContent = lines.join("\n");
        } else {
          textContent = JSON.stringify(payment, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: toStructuredContent(payment),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Update Payment
  server.registerTool(
    "holded_invoicing_update_payment",
    {
      title: "Update Holded Payment",
      description: `Update an existing payment in Holded.

Args:
  - payment_id (string): The payment ID to update (required)
  - amount (number): Payment amount
  - date (number): Payment date as Unix timestamp
  - account_id (string): Treasury/Bank account ID
  - desc (string): Payment description

Returns:
  The updated payment.`,
      inputSchema: UpdatePaymentInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: UpdatePaymentInput) => {
      try {
        const { payment_id, account_id, ...updateData } = params;
        const requestData = {
          ...updateData,
          ...(account_id ? { accountId: account_id } : {}),
        };

        const payment = await makeApiRequest<Payment>(
          "invoicing",
          `payments/${payment_id}`,
          "PUT",
          requestData
        );

        return {
          content: [
            {
              type: "text",
              text: `Payment updated successfully.\n\n${JSON.stringify(payment, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(payment),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Delete Payment
  server.registerTool(
    "holded_invoicing_delete_payment",
    {
      title: "Delete Holded Payment",
      description: `Delete a payment from Holded.

Args:
  - payment_id (string): The payment ID to delete (required)

Returns:
  Confirmation of deletion.`,
      inputSchema: DeletePaymentInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: DeletePaymentInput) => {
      try {
        await makeApiRequest<void>(
          "invoicing",
          `payments/${params.payment_id}`,
          "DELETE"
        );

        return {
          content: [
            {
              type: "text",
              text: `Payment ${params.payment_id} deleted successfully.`,
            },
          ],
          structuredContent: { deleted: true, id: params.payment_id },
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
