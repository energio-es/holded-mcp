/**
 * Document tools for Holded API (invoices, estimates, purchases, etc.)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, makeMultipartApiRequest, toStructuredContent } from "../../services/api.js";
import { resolveAttachmentInput } from "../../services/files.js";
import { ResponseFormat } from "../../constants.js";
import { Document } from "../../types.js";
import { withErrorHandling } from "../utilities.js";
import { resolveTimestamps } from "../../utils/timezone.js";
import { serialize, repairCustomFieldsInPlace } from "../../utils/custom-fields.js";
import {
  ListDocumentsInputSchema,
  GetDocumentInputSchema,
  CreateDocumentInputSchema,
  UpdateDocumentInputSchema,
  DeleteDocumentInputSchema,
  PayDocumentInputSchema,
  SendDocumentInputSchema,
  GetDocumentPdfInputSchema,
  UpdateDocumentTrackingInputSchema,
  UpdateDocumentPipelineInputSchema,
  ListDocumentsInput,
  GetDocumentInput,
  CreateDocumentInput,
  UpdateDocumentInput,
  DeleteDocumentInput,
  PayDocumentInput,
  SendDocumentInput,
  GetDocumentPdfInput,
  UpdateDocumentTrackingInput,
  UpdateDocumentPipelineInput,
  ShipAllItemsInputSchema,
  ShipItemsByLineInputSchema,
  GetShippedItemsInputSchema,
  AttachDocumentFileInputSchema,
  ShipAllItemsInput,
  ShipItemsByLineInput,
  GetShippedItemsInput,
  AttachDocumentFileInput,
} from "../../schemas/invoicing/documents.js";

/**
 * Format documents as markdown
 */
export function formatDocumentsMarkdown(documents: Document[], docType: string): string {
  if (!documents.length) {
    return `No ${docType} documents found.`;
  }

  const lines = [`# ${docType.charAt(0).toUpperCase() + docType.slice(1)} Documents`, "", `Found ${documents.length} documents:`, ""];

  for (const doc of documents) {
    lines.push(`## ${doc.docNumber || doc.id}`);
    lines.push(`- **ID**: ${doc.id}`);
    if (doc.contactName) lines.push(`- **Contact**: ${doc.contactName}`);
    if (doc.date) lines.push(`- **Date**: ${new Date(doc.date * 1000).toLocaleDateString()}`);
    if (doc.total !== undefined) lines.push(`- **Total**: ${doc.total} ${doc.currency || ""}`);
    if (doc.status) lines.push(`- **Status**: ${doc.status}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single document as markdown
 */
export function formatDocumentMarkdown(doc: Document): string {
  const lines = [`# Document: ${doc.docNumber || doc.id}`, ""];

  lines.push(`**ID**: ${doc.id}`);
  if (doc.contactName) lines.push(`**Contact**: ${doc.contactName} (${doc.contact || "N/A"})`);
  if (doc.date) lines.push(`**Date**: ${new Date(doc.date * 1000).toLocaleDateString()}`);
  if (doc.dueDate) lines.push(`**Due Date**: ${new Date(doc.dueDate * 1000).toLocaleDateString()}`);
  if (doc.status) lines.push(`**Status**: ${doc.status}`);
  lines.push("");

  if (doc.products && doc.products.length > 0) {
    lines.push("## Line Items", "");
    lines.push("| Item | Qty | Subtotal | Tax |");
    lines.push("|------|-----|----------|-----|");
    for (const item of doc.products) {
      lines.push(`| ${item.name} | ${item.units || 1} | ${item.subtotal || 0} | ${item.tax || "-"} |`);
    }
    lines.push("");
  }

  lines.push("## Totals", "");
  if (doc.subtotal !== undefined) lines.push(`- **Subtotal**: ${doc.subtotal}`);
  if (doc.tax !== undefined) lines.push(`- **Tax**: ${doc.tax}`);
  if (doc.total !== undefined) lines.push(`- **Total**: ${doc.total} ${doc.currency || ""}`);
  if (doc.paymentsTotal !== undefined) lines.push(`- **Payments Total**: ${doc.paymentsTotal}`);

  if (doc.notes) {
    lines.push("", "## Notes", doc.notes);
  }

  return lines.join("\n");
}

/**
 * Register all document-related tools
 */
export function registerDocumentTools(server: McpServer): void {
  // List Documents
  server.registerTool(
    "holded_invoicing_list_documents",
    {
      title: "List Holded Documents",
      description: `List documents from Holded by type.

Returns paginated list of documents (max 500 per page).

Available document types:
- invoice: Sales invoices
- salesreceipt: Sales receipts
- creditnote: Sales refunds
- receiptnote: Ticket sales refunds
- estimate: Sales estimates/quotes
- salesorder: Sales orders
- waybill: Packing lists
- proform: Proforma invoices
- purchase: Purchases
- purchaserefund: Purchase refunds
- purchaseorder: Purchase orders

Args:
  - doc_type (string): Document type (required)
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - start_date (string): Period start date in YYYY-MM-DD format (optional)
  - end_date (string): Period end date in YYYY-MM-DD format (optional, inclusive)
  - raw_timestamps (boolean): Set to true to use starttmp/endtmp instead of start_date/end_date
  - starttmp (number): Period start as Unix timestamp (raw_timestamps mode only)
  - endtmp (number): Period end as Unix timestamp (raw_timestamps mode only)
  - contactid (string): Filter by contact ID (optional)
  - paid (string): Filter by payment status: 0=unpaid, 1=paid, 2=partial (optional)
  - sort (string): Sort order: created-asc or created-desc (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of documents with id, number, contact, date, total, and status.`,
      inputSchema: ListDocumentsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const typedParams = params as unknown as ListDocumentsInput;
      const { doc_type, page, response_format } = typedParams;
      const queryParams: Record<string, unknown> = {};
      if (page > 1) {
        queryParams.page = page;
      }
      if (typedParams.start_date && !typedParams.end_date) {
        throw new Error("Both start_date and end_date must be provided together.");
      }
      if (!typedParams.start_date && typedParams.end_date) {
        throw new Error("Both start_date and end_date must be provided together.");
      }
      if ((typedParams.start_date && typedParams.end_date) || typedParams.raw_timestamps) {
        const { starttmp, endtmp } = resolveTimestamps(typedParams as {
          raw_timestamps: boolean; starttmp?: number; endtmp?: number;
          start_date?: string; end_date?: string;
        });
        queryParams.starttmp = starttmp;
        queryParams.endtmp = endtmp;
      }
      if (typedParams.contactid) queryParams.contactid = typedParams.contactid;
      if (typedParams.paid) queryParams.paid = typedParams.paid;
      if (typedParams.sort) queryParams.sort = typedParams.sort;

      const documents = await makeApiRequest<Document[]>(
        "invoicing",
        `documents/${doc_type}`,
        "GET",
        undefined,
        queryParams
      );

      for (const doc of documents) repairCustomFieldsInPlace(doc);

      const textContent =
        response_format === ResponseFormat.MARKDOWN
          ? formatDocumentsMarkdown(documents, doc_type)
          : JSON.stringify(documents, null, 2);

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: { documents, count: documents.length, page, docType: doc_type },
      };
    })
  );

  // Get Document
  server.registerTool(
    "holded_invoicing_get_document",
    {
      title: "Get Holded Document",
      description: `Get a specific document by ID from Holded.

Args:
  - doc_type (string): Document type (required)
  - document_id (string): The document ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Document details including line items, totals, and payment status.`,
      inputSchema: GetDocumentInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { doc_type, document_id, response_format } = params as unknown as GetDocumentInput;
      const document = await makeApiRequest<Document>(
        "invoicing",
        `documents/${doc_type}/${document_id}`,
        "GET"
      );

      repairCustomFieldsInPlace(document);

      const textContent =
        response_format === ResponseFormat.MARKDOWN
          ? formatDocumentMarkdown(document)
          : JSON.stringify(document, null, 2);

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: toStructuredContent(document),
      };
    })
  );

  // Create Document
  server.registerTool(
    "holded_invoicing_create_document",
    {
      title: "Create Holded Document",
      description: `Create a new document in Holded (invoice, estimate, purchase, etc.).

Known quirks (important when calling this tool):
- items[].subtotal is in the DOCUMENT currency, not EUR. Holded stores EUR
  base internally as subtotal / currencyChange. Never pre-convert amounts
  to EUR when currency != EUR — that causes double-conversion.
- When you want items[].accountingAccountId to take effect, pass
  applyContactDefaults: false. With the default (true), contact-level
  defaults override line-level accounts — your accountingAccountId is
  silently discarded. This tool rejects that combination at validation
  time; see the error message for the fix.

Args:
  - doc_type (string): Document type (required)
  - items (array): Line items with name, units, subtotal, tax (required)
  - contactId (string): Contact ID to associate
  - date (number): Document date as Unix timestamp
  - dueDate (number): Due date as Unix timestamp
  - notes (string): Document notes
  - applyContactDefaults (boolean): Apply contact defaults (default true).
    Pass false when items[].accountingAccountId is set.
  - And other optional fields

Returns:
  The created document with its assigned ID and number.`,
      inputSchema: CreateDocumentInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { doc_type, ...documentData } = params as unknown as CreateDocumentInput;
      const body: Record<string, unknown> = { ...documentData };
      if (documentData.customFields !== undefined) {
        const wire = serialize(documentData.customFields, "map-per-entry");
        if (wire) body.customFields = wire;
        else delete body.customFields;
      }
      const document = await makeApiRequest<Document>(
        "invoicing",
        `documents/${doc_type}`,
        "POST",
        body,
      );

      repairCustomFieldsInPlace(document);

      return {
        content: [
          {
            type: "text",
            text: `Document created successfully.\n\n${JSON.stringify(document, null, 2)}`,
          },
        ],
        structuredContent: toStructuredContent(document),
      };
    })
  );

  // Update Document
  server.registerTool(
    "holded_invoicing_update_document",
    {
      title: "Update Holded Document",
      description: `Update an existing document in Holded. Only provided fields will be updated.

Known quirks (important when calling this tool):
- items[].subtotal is treated as the EUR BASE on update (asymmetric with
  create). Re-pass values you read from GET to preserve state. Passing
  invoice-currency values over-books the EUR total.
- currencyChange is immutable. The Holded PUT endpoint silently drops it.
  To change the rate: delete the document and recreate. Passing
  currencyChange here returns an "unrecognized key" schema error.

Args:
  - doc_type (string): Document type (required)
  - document_id (string): The document ID to update (required)
  - And other optional fields to update (items, dates, notes, etc.)

Returns:
  The updated document.`,
      inputSchema: UpdateDocumentInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { doc_type, document_id, ...updateData } = params as unknown as UpdateDocumentInput;
      const body: Record<string, unknown> = { ...updateData };
      if (updateData.customFields !== undefined) {
        const wire = serialize(updateData.customFields, "documented");
        if (wire) body.customFields = wire;
        else delete body.customFields;
      }
      const document = await makeApiRequest<Document>(
        "invoicing",
        `documents/${doc_type}/${document_id}`,
        "PUT",
        body,
      );

      repairCustomFieldsInPlace(document);

      return {
        content: [
          {
            type: "text",
            text: `Document updated successfully.\n\n${JSON.stringify(document, null, 2)}`,
          },
        ],
        structuredContent: toStructuredContent(document),
      };
    })
  );

  // Delete Document
  server.registerTool(
    "holded_invoicing_delete_document",
    {
      title: "Delete Holded Document",
      description: `Delete a document from Holded.

Args:
  - doc_type (string): Document type (required)
  - document_id (string): The document ID to delete (required)

Returns:
  Confirmation of deletion.`,
      inputSchema: DeleteDocumentInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { doc_type, document_id } = params as unknown as DeleteDocumentInput;
      await makeApiRequest<void>(
        "invoicing",
        `documents/${doc_type}/${document_id}`,
        "DELETE"
      );

      return {
        content: [
          {
            type: "text",
            text: `Document ${document_id} deleted successfully.`,
          },
        ],
        structuredContent: { deleted: true, id: document_id, docType: doc_type },
      };
    })
  );

  // Pay Document
  server.registerTool(
    "holded_invoicing_pay_document",
    {
      title: "Pay Holded Document",
      description: `Record a payment for a document in Holded.

Args:
  - doc_type (string): Document type (required)
  - document_id (string): The document ID to pay (required)
  - amount (number): Payment amount (if different from document total)
  - account_id (string): Treasury/Bank account ID
  - date (number): Payment date as Unix timestamp

Returns:
  Confirmation of payment.`,
      inputSchema: PayDocumentInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { doc_type, document_id, account_id, ...paymentData } = params as unknown as PayDocumentInput;
      const requestData = {
        ...paymentData,
        ...(account_id ? { treasury: account_id } : {}),
      };

      const result = await makeApiRequest<{ status: string; [key: string]: unknown }>(
        "invoicing",
        `documents/${doc_type}/${document_id}/pay`,
        "POST",
        requestData
      );

      return {
        content: [
          {
            type: "text",
            text: `Payment recorded successfully.\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
        structuredContent: { paid: true, documentId: document_id, docType: doc_type, ...result },
      };
    })
  );

  // Send Document
  server.registerTool(
    "holded_invoicing_send_document",
    {
      title: "Send Holded Document",
      description: `Send a document via email in Holded.

Args:
  - doc_type (string): Document type (required)
  - document_id (string): The document ID to send (required)
  - emails (string): Recipient email(s), comma-separated (required)
  - subject (string): Email subject
  - message (string): Email message body

Returns:
  Confirmation of sending.`,
      inputSchema: SendDocumentInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { doc_type, document_id, ...sendData } = params as unknown as SendDocumentInput;
      const result = await makeApiRequest<{ status: string; [key: string]: unknown }>(
        "invoicing",
        `documents/${doc_type}/${document_id}/send`,
        "POST",
        sendData
      );

      return {
        content: [
          {
            type: "text",
            text: `Document sent successfully.\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
        structuredContent: { sent: true, documentId: document_id, docType: doc_type, ...result },
      };
    })
  );

  // Get Document PDF
  server.registerTool(
    "holded_invoicing_get_document_pdf",
    {
      title: "Get Holded Document PDF",
      description: `Get the PDF version of a document from Holded.

Args:
  - doc_type (string): Document type (required)
  - document_id (string): The document ID to get PDF for (required)

Returns:
  PDF file data (base64 encoded or URL).`,
      inputSchema: GetDocumentPdfInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { doc_type, document_id } = params as unknown as GetDocumentPdfInput;
      const result = await makeApiRequest<{ url?: string; data?: string; [key: string]: unknown }>(
        "invoicing",
        `documents/${doc_type}/${document_id}/pdf`,
        "GET"
      );

      return {
        content: [
          {
            type: "text",
            text: result.url
              ? `PDF URL: ${result.url}\n\n${JSON.stringify(result, null, 2)}`
              : JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: { documentId: document_id, docType: doc_type, ...result },
      };
    })
  );

  // Update Document Tracking
  server.registerTool(
    "holded_invoicing_update_document_tracking",
    {
      title: "Update Holded Document Tracking",
      description: `Update tracking information for a document in Holded.

Note: This endpoint only works with 'salesorder' and 'waybill' document types.

Args:
  - doc_type ('salesorder' | 'waybill'): Document type (required)
  - document_id (string): The document ID to update tracking for (required)
  - key (string): Carrier key - one of: mrw, ups, fedex, tnt, seur, nacex, correos, asm, uspostalservice, dbschenker, royalmail, bluedart, palletways, correosexpress, tourline, other
  - name (string): Carrier display name (use custom name when key is 'other')
  - num (string): Tracking number(s) - can add multiple separated by comma or dash (e.g., "1,2-3")
  - pickUpDate (string): Pick up date in DD/MM/YYYY format
  - deliveryDate (string): Delivery date in DD/MM/YYYY format
  - notes (string): Notes for the tracking

Returns:
  Confirmation of tracking update.`,
      inputSchema: UpdateDocumentTrackingInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { doc_type, document_id, ...trackingData } = params as unknown as UpdateDocumentTrackingInput;
      const result = await makeApiRequest<{ status: number; info?: string; data?: string; [key: string]: unknown }>(
        "invoicing",
        `documents/${doc_type}/${document_id}/updatetracking`,
        "POST",
        trackingData
      );

      return {
        content: [
          {
            type: "text",
            text: `Tracking information updated successfully.\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
        structuredContent: { updated: true, documentId: document_id, docType: doc_type, ...result },
      };
    })
  );

  // Update Document Pipeline
  server.registerTool(
    "holded_invoicing_update_document_pipeline",
    {
      title: "Update Holded Document Pipeline",
      description: `Update the pipeline stage for a document in Holded.

Note: This endpoint only works with 'salesorder' and 'waybill' document types.

Args:
  - doc_type ('salesorder' | 'waybill'): Document type (required)
  - document_id (string): The document ID to update pipeline for (required)
  - pipeline (string): Pipeline stage identifier (required)

Returns:
  Confirmation of pipeline update.`,
      inputSchema: UpdateDocumentPipelineInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { doc_type, document_id, pipeline } = params as unknown as UpdateDocumentPipelineInput;
      const result = await makeApiRequest<{ status: number; info?: string; [key: string]: unknown }>(
        "invoicing",
        `documents/${doc_type}/${document_id}/pipeline/set`,
        "POST",
        { pipeline }
      );

      return {
        content: [
          {
            type: "text",
            text: `Pipeline updated successfully.\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
        structuredContent: { updated: true, documentId: document_id, docType: doc_type, ...result },
      };
    })
  );

  // Ship All Items
  server.registerTool(
    "holded_invoicing_ship_all_items",
    {
      title: "Ship All Items from Holded Sales Order",
      description: `Ship all the items of a specific sales order in Holded.

Args:
  - document_id (string): The sales order document ID to ship all items for (required)

Returns:
  Confirmation of shipping with status and info.`,
      inputSchema: ShipAllItemsInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { document_id } = params as unknown as ShipAllItemsInput;
      const result = await makeApiRequest<{ status: number; info: string; [key: string]: unknown }>(
        "invoicing",
        `documents/salesorder/${document_id}/shipall`,
        "POST"
      );

      return {
        content: [
          {
            type: "text",
            text: `Items shipped successfully.\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
        structuredContent: { shipped: true, documentId: document_id, ...result },
      };
    })
  );

  // Ship Items By Line
  server.registerTool(
    "holded_invoicing_ship_items_by_line",
    {
      title: "Ship Items by Line from Holded Sales Order",
      description: `Ship specific items of a sales order by line position in Holded.

Args:
  - document_id (string): The sales order document ID to ship items for (required)
  - lines (array): Array of item lines to ship, each with:
    - itemLinePosition (number): Item line position (starts at 0)
    - units (number): Number of units to ship

Returns:
  Confirmation of shipping with status and info.`,
      inputSchema: ShipItemsByLineInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { document_id, lines } = params as unknown as ShipItemsByLineInput;
      const result = await makeApiRequest<{ status: number; info: string; [key: string]: unknown }>(
        "invoicing",
        `documents/salesorder/${document_id}/shipbylines`,
        "POST",
        { lines }
      );

      return {
        content: [
          {
            type: "text",
            text: `Items shipped successfully.\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
        structuredContent: { shipped: true, documentId: document_id, lines, ...result },
      };
    })
  );

  // Get Shipped Items
  server.registerTool(
    "holded_invoicing_get_shipped_items",
    {
      title: "Get Shipped Items from Holded Document",
      description: `For each item included in a sales or purchase order, get the number of units shipped or received.

Args:
  - doc_type ('salesorder' | 'order'): Document type (required)
  - document_id (string): The document ID to get shipped items for (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of items with name, sku, total, sent, and pending quantities.`,
      inputSchema: GetShippedItemsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { doc_type, document_id, response_format } = params as unknown as GetShippedItemsInput;
      const shippedItems = await makeApiRequest<Array<{
        name: string;
        sku: string;
        total: number;
        sent: number;
        pending: number;
      }>>(
        "invoicing",
        `documents/${doc_type}/${document_id}/shippeditems`,
        "GET"
      );

      let textContent: string;
      if (response_format === ResponseFormat.MARKDOWN) {
        if (!shippedItems.length) {
          textContent = `No shipped items found for document ${document_id}.`;
        } else {
          const lines = ["# Shipped Items", "", `Found ${shippedItems.length} items:`, ""];
          lines.push("| Item | SKU | Total | Sent | Pending |");
          lines.push("|------|-----|-------|------|---------|");
          for (const item of shippedItems) {
            lines.push(`| ${item.name} | ${item.sku || "-"} | ${item.total} | ${item.sent} | ${item.pending} |`);
          }
          textContent = lines.join("\n");
        }
      } else {
        textContent = JSON.stringify(shippedItems, null, 2);
      }

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: { shippedItems, count: shippedItems.length, documentId: document_id, docType: doc_type },
      };
    })
  );

  // Attach File to Document
  server.registerTool(
    "holded_invoicing_attach_document_file",
    {
      title: "Attach File to Holded Document",
      description: `Attach a file to a specific document in Holded.

Provide the file via either an absolute local file path (preferred) or a base64-encoded string.

Args:
  - doc_type (string): Document type (required)
  - document_id (string): The document ID to attach file to (required)
  - file_path (string): Absolute local path to the file, e.g. /Users/me/invoice.pdf or ~/Downloads/invoice.pdf. Preferred for large files — avoids base64 token overhead.
  - file_content (string): File content as base64-encoded string. Fallback when no local path is available.
  - file_name (string): File name. Required when file_content is used; with file_path, defaults to the path basename. Provide explicitly to rename on upload.
  - set_main (boolean): Set this file as the main attachment

Exactly one of file_path or file_content must be provided.

Returns:
  Confirmation of file attachment with status and info.`,
      inputSchema: AttachDocumentFileInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const typedParams = params as unknown as AttachDocumentFileInput;
      const { buffer, fileName } = await resolveAttachmentInput(typedParams);

      const result = await makeMultipartApiRequest<{ status: number; info: string; [key: string]: unknown }>(
        "invoicing",
        `documents/${typedParams.doc_type}/${typedParams.document_id}/attach`,
        buffer,
        fileName,
        typedParams.set_main
      );

      return {
        content: [
          {
            type: "text",
            text: `File attached successfully.\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
        structuredContent: { attached: true, documentId: typedParams.document_id, docType: typedParams.doc_type, fileName, ...result },
      };
    })
  );
}
