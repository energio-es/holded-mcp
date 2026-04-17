/**
 * Zod schemas for Document-related operations
 */

import { z } from "zod";
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
  DocumentTypeSchema,
  TimestampSchema,
  CustomFieldsSchema,
} from "../common.js";
import { accountingDateRangeFields } from "../accounting/date-range.js";
import { attachmentInputFields, attachmentInputSuperRefine } from "./attachment-input.js";

/**
 * Document item schema
 */
export const DocumentItemSchema = z.strictObject({
  name: z.string().min(1).describe("Item name (required)"),
  desc: z.string().optional().describe("Item description"),
  units: z.number().positive().optional().describe("Quantity"),
  subtotal: z.number().optional().describe(
    "Subtotal before tax. Interpretation DIFFERS by operation: " +
    "on create this is in the document currency (Holded divides by " +
    "currencyChange to store EUR base); on update this is the EUR base " +
    "itself (stored verbatim). See the tool description for the full rule."
  ),
  tax: z.string().optional().describe("Tax rate ID or percentage (single tax)"),
  taxes: z.array(z.string()).optional().describe("Multiple tax keys (e.g., ['s_iva_21'])"),
  discount: z.number().min(0).max(100).optional().describe("Discount percentage"),
  productId: z.string().optional().describe("Product ID if linked to a product"),
  sku: z.string().optional().describe("SKU code"),
  weight: z.number().min(0).optional().describe("Item weight"),
  accountingAccountId: z.string().optional().describe("Accounting account ID"),
  serviceId: z.string().optional().describe("Service identifier"),
  supplied: z.enum(["Yes", "No"]).optional().describe("Whether item has been supplied"),
  tags: z.array(z.string()).optional().describe("Item tags"),
  kind: z.string().optional().describe("Item kind (e.g., 'lots')"),
  lotSku: z.string().optional().describe("Lot SKU (required when kind is 'lots')"),
})

/**
 * List documents input schema
 */
export const ListDocumentsInputSchema = z.strictObject({
  doc_type: DocumentTypeSchema,
  page: PaginationSchema.shape.page,
  ...accountingDateRangeFields,
  contactid: z.string().optional().describe("Filter by contact ID"),
  paid: z.enum(["0", "1", "2"]).optional().describe("Filter by payment status: 0=unpaid, 1=paid, 2=partial"),
  sort: z.enum(["created-asc", "created-desc"]).optional().describe("Sort order by creation date"),
  response_format: ResponseFormatSchema,
})

export type ListDocumentsInput = z.infer<typeof ListDocumentsInputSchema>;

/**
 * Get document input schema
 */
export const GetDocumentInputSchema = z.strictObject({
  doc_type: DocumentTypeSchema,
  document_id: IdSchema.describe("The document ID to retrieve"),
  response_format: ResponseFormatSchema,
})

export type GetDocumentInput = z.infer<typeof GetDocumentInputSchema>;

/**
 * Create document input schema
 */
export const CreateDocumentInputSchema = z.strictObject({
  doc_type: DocumentTypeSchema,
  // Contact identification (provide one)
  contactId: z.string().optional().describe("Contact ID to associate with the document"),
  contactName: z.string().optional().describe("Contact name (used if creating a new contact)"),
  contactCode: z.string().optional().describe("Contact NIF/CIF/VAT identifier"),
  contactEmail: z.string().optional().describe("Contact email"),
  contactAddress: z.string().optional().describe("Contact street address"),
  contactCity: z.string().optional().describe("Contact city"),
  contactCp: z.string().optional().describe("Contact postal code"),
  contactProvince: z.string().optional().describe("Contact province"),
  contactCountryCode: z.string().optional().describe("Contact country code"),
  // Document details
  date: z.number().int().positive().describe("Document date as Unix timestamp (required)"),
  dueDate: TimestampSchema.describe("Due date as Unix timestamp"),
  desc: z.string().optional().describe("Document description"),
  notes: z.string().optional().describe("Document notes"),
  language: z.string().optional().describe("Document language code"),
  currency: z.string().optional().describe("ISO currency code (e.g., 'eur')"),
  currencyChange: z.number().positive().optional().describe("Currency exchange rate"),
  // Document configuration
  invoiceNum: z.string().optional().describe("Custom document number (auto-generated if not provided)"),
  numSerieId: z.string().optional().describe("Numbering series ID"),
  salesChannelId: z.string().optional().describe("Sales channel ID"),
  paymentMethodId: z.string().optional().describe("Payment method ID"),
  designId: z.string().optional().describe("Document design template ID"),
  warehouseId: z.string().optional().describe("Warehouse ID (for salesorder/purchaseorder/waybill)"),
  approveDoc: z.boolean().optional().describe("Auto-approve document (default false)"),
  applyContactDefaults: z.boolean().optional().describe("Apply contact defaults (default true)"),
  directDebitProvider: z.string().optional().describe("Direct debit provider (e.g., 'gocardless')"),
  // Shipping
  shippingAddress: z.string().optional().describe("Shipping street address"),
  shippingPostalCode: z.string().optional().describe("Shipping postal code"),
  shippingCity: z.string().optional().describe("Shipping city"),
  shippingProvince: z.string().optional().describe("Shipping province"),
  shippingCountry: z.string().optional().describe("Shipping country"),
  // Items and metadata
  items: z
    .array(DocumentItemSchema)
    .min(1, { message: "At least one item is required" })
    .describe("Document line items (required)"),
  customFields: CustomFieldsSchema,
  tags: z.array(z.string()).optional().describe("Document tags"),
}).superRefine((data, ctx) => {
  const hasItemAccount = data.items?.some((item) => item.accountingAccountId);
  if (hasItemAccount && data.applyContactDefaults !== false) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["applyContactDefaults"],
      message:
        "When items[].accountingAccountId is set, applyContactDefaults must be " +
        "explicitly false. Omitting it (Holded defaults to true) or setting it to " +
        "true causes the contact's default account to override your line-level " +
        "accountingAccountId.",
    });
  }
});

export type CreateDocumentInput = z.infer<typeof CreateDocumentInputSchema>;

/**
 * Update document input schema
 */
export const UpdateDocumentInputSchema = z.strictObject({
  doc_type: DocumentTypeSchema,
  document_id: IdSchema.describe("The document ID to update"),
  contactId: z.string().optional().describe("Contact ID to associate with the document"),
  date: TimestampSchema.describe("Document date as Unix timestamp"),
  dueDate: TimestampSchema.describe("Due date as Unix timestamp"),
  desc: z.string().optional().describe("Document description"),
  notes: z.string().optional().describe("Document notes"),
  language: z.string().optional().describe("Document language code"),
  items: z.array(DocumentItemSchema).optional().describe("Document line items"),
  salesChannelId: z.string().optional().describe("Sales channel ID"),
  paymentMethod: z.string().optional().describe("Payment method ID"),
  warehouseId: z.string().optional().describe("Warehouse ID (for salesorder/purchaseorder/waybill)"),
  expAccountId: z.string().optional().describe("Expenses account ID"),
  customFields: CustomFieldsSchema,
})

export type UpdateDocumentInput = z.infer<typeof UpdateDocumentInputSchema>;

/**
 * Delete document input schema
 */
export const DeleteDocumentInputSchema = z.strictObject({
  doc_type: DocumentTypeSchema,
  document_id: IdSchema.describe("The document ID to delete"),
})

export type DeleteDocumentInput = z.infer<typeof DeleteDocumentInputSchema>;

/**
 * Pay document input schema
 */
export const PayDocumentInputSchema = z.strictObject({
  doc_type: DocumentTypeSchema,
  document_id: IdSchema.describe("The document ID to pay"),
  amount: z.number().positive().optional().describe("Payment amount (if different from document total)"),
  account_id: z.string().optional().describe("Treasury/Bank account ID"),
  date: TimestampSchema.describe("Payment date as Unix timestamp"),
})

export type PayDocumentInput = z.infer<typeof PayDocumentInputSchema>;

/**
 * Send document input schema
 */
export const SendDocumentInputSchema = z.strictObject({
  doc_type: DocumentTypeSchema,
  document_id: IdSchema.describe("The document ID to send"),
  emails: z.string().describe("Recipient email(s), comma-separated"),
  subject: z.string().optional().describe("Email subject"),
  message: z.string().optional().describe("Email message body"),
  mailTemplateId: z.string().optional().describe("Mail template ID to use"),
  docIds: z.string().optional().describe("Additional document IDs to attach"),
})

export type SendDocumentInput = z.infer<typeof SendDocumentInputSchema>;

/**
 * Get document PDF input schema
 */
export const GetDocumentPdfInputSchema = z.strictObject({
  doc_type: DocumentTypeSchema,
  document_id: IdSchema.describe("The document ID to get PDF for"),
})

export type GetDocumentPdfInput = z.infer<typeof GetDocumentPdfInputSchema>;

/**
 * Tracking document type schema - tracking only works with salesorder and waybill
 */
export const TrackingDocTypeSchema = z.enum(["salesorder", "waybill"]).describe("Document type (only salesorder or waybill supported)");

/**
 * Carrier key schema - predefined carrier keys supported by Holded
 */
export const CarrierKeySchema = z.enum([
  "mrw", "ups", "fedex", "tnt", "seur", "nacex", "correos", "asm",
  "uspostalservice", "dbschenker", "royalmail", "bluedart", "palletways",
  "correosexpress", "tourline", "other"
]).describe("Carrier key identifier");

/**
 * Update document tracking input schema
 * Per Holded API: POST /documents/{docType}/{documentId}/updatetracking
 */
export const UpdateDocumentTrackingInputSchema = z.strictObject({
  doc_type: TrackingDocTypeSchema,
  document_id: IdSchema.describe("The document ID to update tracking for"),
  key: CarrierKeySchema.optional().describe("Carrier key - use 'other' for custom carriers"),
  name: z.string().optional().describe("Carrier display name (use custom name when key is 'other')"),
  num: z.string().optional().describe("Tracking number(s) - can add multiple separated by comma or dash (e.g., '1,2-3')"),
  pickUpDate: z.string().optional().describe("Pick up date in DD/MM/YYYY format"),
  deliveryDate: z.string().optional().describe("Delivery date in DD/MM/YYYY format"),
  notes: z.string().optional().describe("Notes for the tracking"),
})

export type UpdateDocumentTrackingInput = z.infer<typeof UpdateDocumentTrackingInputSchema>;

/**
 * Update document pipeline input schema
 * Per Holded API: POST /documents/{docType}/{documentId}/pipeline/set
 */
export const UpdateDocumentPipelineInputSchema = z.strictObject({
  doc_type: TrackingDocTypeSchema, // Pipeline also only works with salesorder and waybill
  document_id: IdSchema.describe("The document ID to update pipeline for"),
  pipeline: z.string().min(1).describe("Pipeline stage identifier (required)"),
})

export type UpdateDocumentPipelineInput = z.infer<typeof UpdateDocumentPipelineInputSchema>;

/**
 * Ship items by line schema
 */
export const ShipItemLineSchema = z.strictObject({
  itemLinePosition: z.number().int().min(0).describe("Item line position (starts at 0)"),
  units: z.number().int().positive().describe("Number of units to ship"),
});

/**
 * Ship all items input schema
 */
export const ShipAllItemsInputSchema = z.strictObject({
  document_id: IdSchema.describe("The sales order document ID to ship all items for"),
});

export type ShipAllItemsInput = z.infer<typeof ShipAllItemsInputSchema>;

/**
 * Ship items by line input schema
 */
export const ShipItemsByLineInputSchema = z.strictObject({
  document_id: IdSchema.describe("The sales order document ID to ship items for"),
  lines: z.array(ShipItemLineSchema).min(1, { message: "At least one line is required" }).describe("Array of item lines to ship (required)"),
});

export type ShipItemsByLineInput = z.infer<typeof ShipItemsByLineInputSchema>;

/**
 * Get shipped items input schema
 */
export const GetShippedItemsInputSchema = z.strictObject({
  doc_type: z.enum(["salesorder", "order"]).describe("Document type: salesorder or order"),
  document_id: IdSchema.describe("The document ID to get shipped items for"),
  response_format: ResponseFormatSchema,
});

export type GetShippedItemsInput = z.infer<typeof GetShippedItemsInputSchema>;

/**
 * Attach file to document input schema.
 *
 * Accepts either a local absolute file path (`file_path`, preferred — avoids
 * base64 token overhead) or a base64-encoded string (`file_content`, legacy).
 * Exactly one source must be provided. With `file_path`, `file_name` is
 * optional and defaults to the path basename.
 */
export const AttachDocumentFileInputSchema = z
  .strictObject({
    doc_type: DocumentTypeSchema,
    document_id: IdSchema.describe("The document ID to attach file to"),
    ...attachmentInputFields(),
    set_main: z.boolean().optional().describe("Set this file as the main attachment"),
  })
  .superRefine(attachmentInputSuperRefine);

export type AttachDocumentFileInput = z.infer<typeof AttachDocumentFileInputSchema>;
