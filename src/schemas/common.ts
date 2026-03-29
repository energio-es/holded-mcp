/**
 * Common Zod schemas shared across all tools
 */

import { z } from "zod";
import { ResponseFormat, DOCUMENT_TYPES } from "../constants.js";

/**
 * Response format schema
 */
export const ResponseFormatSchema = z
  .nativeEnum(ResponseFormat)
  .default(ResponseFormat.JSON)
  .describe("Output format: 'json' for structured data or 'markdown' for human-readable");

/**
 * Pagination schema
 */
export const PaginationSchema = z.strictObject({
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe("Page number for pagination (starts at 1)"),
});

/**
 * ID parameter schema
 */
export const IdSchema = z
  .string()
  .min(1, { message: "ID is required" })
  .describe("The unique identifier");

/**
 * Document type schema
 */
export const DocumentTypeSchema = z
  .enum(DOCUMENT_TYPES)
  .describe(
    "Document type: invoice, salesreceipt, creditnote, receiptnote, estimate, salesorder, waybill, proform, purchase, purchaserefund, purchaseorder"
  );

/**
 * Optional string schema
 */
export const OptionalStringSchema = z.string().optional();

/**
 * Optional number schema
 */
export const OptionalNumberSchema = z.number().optional();

/**
 * Optional boolean schema
 */
export const OptionalBooleanSchema = z.boolean().optional();

/**
 * Date as timestamp schema (Unix timestamp in seconds)
 */
export const TimestampSchema = z
  .number()
  .int()
  .positive()
  .optional()
  .describe("Unix timestamp in seconds");

/**
 * Currency code schema (ISO 4217)
 */
export const CurrencySchema = z
  .string()
  .length(3)
  .toUpperCase()
  .optional()
  .describe("Currency code (ISO 4217, e.g., EUR, USD)");

/**
 * Tags array schema
 */
export const TagsSchema = z
  .array(z.string())
  .optional()
  .describe("Array of tags");

/**
 * Address schema
 */
export const AddressSchema = z.strictObject({
  address: z.string().optional().describe("Street address"),
  city: z.string().optional().describe("City name"),
  postalCode: z.string().optional().describe("Postal/ZIP code"),
  province: z.string().optional().describe("Province/State"),
  country: z.string().optional().describe("Country name"),
  countryCode: z.string().optional().describe("Country code (ISO 3166-1 alpha-2)"),
});

/**
 * Shipping address schema (extends address with name and notes)
 */
export const ShippingAddressSchema = z.strictObject({
  name: z.string().optional().describe("Address label/name"),
  address: z.string().optional().describe("Street address"),
  city: z.string().optional().describe("City name"),
  postalCode: z.string().optional().describe("Postal/ZIP code"),
  province: z.string().optional().describe("Province/State"),
  country: z.string().optional().describe("Country name"),
  notes: z.string().optional().describe("Public notes"),
  privateNote: z.string().optional().describe("Private notes"),
});

/**
 * Numbering series schema (per-document-type numbering series IDs)
 */
export const NumberingSeriesSchema = z.strictObject({
  invoice: z.string().optional().describe("Numbering series ID for invoices"),
  receipt: z.string().optional().describe("Numbering series ID for receipts"),
  salesOrder: z.string().optional().describe("Numbering series ID for sales orders"),
  purchasesOrder: z.string().optional().describe("Numbering series ID for purchase orders"),
  proform: z.string().optional().describe("Numbering series ID for proforms"),
  waybill: z.string().optional().describe("Numbering series ID for waybills"),
}).optional();

/**
 * Contact person schema
 */
export const ContactPersonSchema = z.strictObject({
  name: z.string().min(1).describe("Contact person name (required)"),
  phone: z.string().optional().describe("Phone number"),
  email: z.string().email().optional().describe("Email address"),
});

/**
 * Custom field schema
 */
export const CustomFieldSchema = z.strictObject({
  field: z.string().describe("Custom field name"),
  value: z.string().describe("Custom field value"),
});

/**
 * Custom fields array schema
 */
export const CustomFieldsSchema = z
  .array(CustomFieldSchema)
  .optional()
  .describe("Array of custom fields");
