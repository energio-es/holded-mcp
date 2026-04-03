/**
 * Payment tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, toStructuredContent } from "../../services/api.js";
import { Payment } from "../../types.js";
import {
  CreatePaymentInputSchema,
  ListPaymentsInputSchema,
  GetPaymentInputSchema,
  UpdatePaymentInputSchema,
  DeletePaymentInputSchema,
  CreatePaymentInput,
  UpdatePaymentInput,
} from "../../schemas/invoicing/payments.js";
import { registerCrudTools } from "../factory.js";
import { withErrorHandling } from "../utilities.js";
import { resolveTimestamps } from "../../utils/timezone.js";

/**
 * Format payments as markdown
 */
export function formatPaymentsMarkdown(payments: Payment[]): string {
  if (!payments.length) {
    return "No payments found.";
  }

  const lines = ["# Payments", "", `Found ${payments.length} payments:`, ""];

  for (const payment of payments) {
    lines.push(`## Payment ${payment.id}`);
    lines.push(`- **ID**: ${payment.id}`);
    lines.push(`- **Document ID**: ${payment.documentId}`);
    lines.push(`- **Amount**: ${payment.amount}`);
    lines.push(`- **Date**: ${new Date(payment.date * 1000).toLocaleDateString()}`);
    if (payment.bankId) lines.push(`- **Bank ID**: ${payment.bankId}`);
    if (payment.desc) lines.push(`- **Description**: ${payment.desc}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single payment as markdown
 */
export function formatPaymentMarkdown(payment: Payment): string {
  const lines = [`# Payment ${payment.id}`, ""];
  lines.push(`- **ID**: ${payment.id}`);
  lines.push(`- **Document ID**: ${payment.documentId}`);
  lines.push(`- **Amount**: ${payment.amount}`);
  lines.push(`- **Date**: ${new Date(payment.date * 1000).toLocaleDateString()}`);
  if (payment.bankId) lines.push(`- **Bank ID**: ${payment.bankId}`);
  if (payment.desc) lines.push(`- **Description**: ${payment.desc}`);
  return lines.join("\n");
}

/**
 * Register all payment-related tools
 */
export function registerPaymentTools(server: McpServer): void {
  // ── Standard CRUD via factory (list, get, delete) ─────
  registerCrudTools<Payment>(server, {
    module: "invoicing",
    toolPrefix: "holded_invoicing",
    resource: "payment",
    resourcePlural: "payments",
    endpoint: "payments",
    idParam: "payment_id",
    schemas: {
      list: ListPaymentsInputSchema,
      get: GetPaymentInputSchema,
      delete: DeletePaymentInputSchema,
    },
    titles: {
      list: "List Holded Payments",
      get: "Get Holded Payment",
      delete: "Delete Holded Payment",
    },
    descriptions: {
      list: `List all payments from Holded.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - start_date (string): Period start date in YYYY-MM-DD format (optional)
  - end_date (string): Period end date in YYYY-MM-DD format (optional, inclusive)
  - raw_timestamps (boolean): Set to true to use starttmp/endtmp instead of start_date/end_date
  - starttmp (number): Period start as Unix timestamp (raw_timestamps mode only)
  - endtmp (number): Period end as Unix timestamp (raw_timestamps mode only)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of payments with id, documentId, amount, date, and bank information.`,
      get: `Get a specific payment by ID from Holded.

Args:
  - payment_id (string): The payment ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Payment details including document ID, amount, date, and account information.`,
      delete: `Delete a payment from Holded.

Args:
  - payment_id (string): The payment ID to delete (required)

Returns:
  Confirmation of deletion.`,
    },
    formatters: {
      list: formatPaymentsMarkdown,
      single: formatPaymentMarkdown,
    },
    listQueryParams: (params) => {
      const qp: Record<string, unknown> = {};
      if ((params.start_date && params.end_date) || params.raw_timestamps) {
        const { starttmp, endtmp } = resolveTimestamps(params as {
          raw_timestamps: boolean; starttmp?: number; endtmp?: number;
          start_date?: string; end_date?: string;
        });
        qp.starttmp = starttmp;
        qp.endtmp = endtmp;
      }
      return qp;
    },
  });

  // ── Manual tools (need snake_to_camel conversion) ─────

  // Create Payment
  server.registerTool(
    "holded_invoicing_create_payment",
    {
      title: "Create Holded Payment",
      description: `Create a payment in Holded.

Args:
  - doc_id (string): The document ID to apply the payment to
  - contact_id (string): The contact ID to apply the payment to
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
    withErrorHandling(async (params) => {
      const { doc_id, contact_id, account_id, ...paymentData } = params as unknown as CreatePaymentInput;
      const requestData = {
        ...paymentData,
        ...(doc_id ? { documentId: doc_id } : {}),
        ...(contact_id ? { contactId: contact_id } : {}),
        ...(account_id ? { bankId: account_id } : {}),
      };

      const payment = await makeApiRequest<Payment>(
        "invoicing",
        "payments",
        "POST",
        requestData
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
    })
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
    withErrorHandling(async (params) => {
      const { payment_id, account_id, ...updateData } = params as unknown as UpdatePaymentInput;
      const requestData = {
        ...updateData,
        ...(account_id ? { bankId: account_id } : {}),
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
    })
  );
}
