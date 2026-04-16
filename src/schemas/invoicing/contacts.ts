/**
 * Zod schemas for Contact-related operations
 */

import { z } from "zod";
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
  AddressSchema,
  ShippingAddressSchema,
  TagsSchema,
  NumberingSeriesSchema,
  ContactPersonSchema,
} from "../common.js";
import { attachmentInputFields, attachmentInputSuperRefine } from "./attachment-input.js";

/**
 * List contacts input schema
 */
export const ListContactsInputSchema = z.strictObject({
  page: PaginationSchema.shape.page,
  phone: z.string().optional().describe("Filter by exact phone number (include + prefix, e.g., +34612345678)"),
  mobile: z.string().optional().describe("Filter by exact mobile number (include + prefix)"),
  response_format: ResponseFormatSchema,
});

export type ListContactsInput = z.infer<typeof ListContactsInputSchema>;

/**
 * Get contact input schema
 */
export const GetContactInputSchema = z.strictObject({
  contact_id: IdSchema.describe("The contact ID to retrieve"),
  response_format: ResponseFormatSchema,
});

export type GetContactInput = z.infer<typeof GetContactInputSchema>;

/**
 * Social networks schema
 */
export const SocialNetworksSchema = z.strictObject({
    website: z.string().url().optional().describe("Website URL"),
    facebook: z.string().optional().describe("Facebook profile"),
    twitter: z.string().optional().describe("Twitter handle"),
    linkedin: z.string().optional().describe("LinkedIn profile"),
    instagram: z.string().optional().describe("Instagram handle"),
  })
  .optional();

/**
 * Contact defaults schema
 */
export const ContactDefaultsSchema = z.strictObject({
    salesChannel: z.string().optional().describe("Default sales channel"),
    paymentMethod: z.string().optional().describe("Default payment method ID"),
    paymentDay: z.number().int().min(1).max(31).optional().describe("Default payment day of month"),
    dueDays: z.number().int().min(0).optional().describe("Default due days"),
    expensesAccountRecord: z.number().int().optional().describe("Default expenses account record"),
    expensesAccountName: z.string().optional().describe("Default expenses account name"),
    salesAccountRecord: z.number().int().optional().describe("Default sales account record"),
    salesAccountName: z.string().optional().describe("Default sales account name"),
    salesTaxes: z.array(z.string()).optional().describe("Default sales tax keys (e.g., [\"s_iva_21\"]). Use get_taxes tool to list available keys."),
    purchasesTaxes: z.array(z.string()).optional().describe("Default purchase tax keys (e.g., [\"p_iva_21\"], [\"p_iva_adqintras_21\"], [\"p_iva_21\", \"p_ret_15\"]). Use get_taxes tool to list available keys."),
    accumulateInForm347: z.enum(["Yes", "No"]).optional().describe("Accumulate in Form 347"),
    discount: z.number().int().min(0).max(100).optional().describe("Default discount percentage"),
    currency: z.string().optional().describe("ISO currency code lowercase (e.g., 'eur')"),
    language: z.enum(["es", "en", "fr", "de", "it", "ca", "eu"]).optional().describe("Default language"),
    showTradeNameOnDocs: z.boolean().optional().describe("Show trade name on documents"),
    showCountryOnDocs: z.boolean().optional().describe("Show country on documents"),
  })
  .optional();

/**
 * Create contact input schema
 */
export const CreateContactInputSchema = z.strictObject({
  name: z.string().min(1, { message: "Name is required" }).describe("Contact name (required)"),
  CustomId: z.string().optional().describe("Custom reference identifier"), // PascalCase matches Holded API field name
  code: z.string().optional().describe("Contact code/reference (NIF/CIF/VAT)"),
  tradeName: z.string().optional().describe("Trade/business name"),
  email: z.string().email().optional().describe("Email address"),
  phone: z.string().optional().describe("Phone number"),
  mobile: z.string().optional().describe("Mobile phone number"),
  type: z
    .enum(["client", "supplier", "lead", "debtor", "creditor"])
    .optional()
    .describe("Contact type"),
  isperson: z.boolean().optional().describe("Is this an individual person (true) or company (false)"),
  iban: z.string().optional().describe("Bank IBAN"),
  swift: z.string().optional().describe("Bank SWIFT/BIC code"),
  sepaRef: z.string().optional().describe("SEPA reference"),
  sepaDate: z.number().optional().describe("SEPA date"),
  clientRecord: z.number().int().optional().describe("Client accounting record number"),
  supplierRecord: z.number().int().optional().describe("Supplier accounting record number"),
  taxOperation: z.enum(["general", "intra", "impexp", "nosujeto", "receq", "exento"]).optional().describe("Tax operation type (Spain)"),
  groupId: z.string().optional().describe("Contact group ID"),
  billAddress: AddressSchema.optional().describe("Billing address"),
  shippingAddresses: z.array(ShippingAddressSchema).optional().describe("Shipping addresses"),
  socialNetworks: SocialNetworksSchema,
  defaults: ContactDefaultsSchema,
  numberingSeries: NumberingSeriesSchema.optional(),
  contactPersons: z.array(ContactPersonSchema).optional().describe("Contact persons"),
  tags: TagsSchema,
  note: z.string().optional().describe("Notes about the contact"),
});

export type CreateContactInput = z.infer<typeof CreateContactInputSchema>;

/**
 * Update contact input schema
 */
export const UpdateContactInputSchema = z.strictObject({
  contact_id: IdSchema.describe("The contact ID to update"),
  name: z.string().min(1).optional().describe("Contact name"),
  CustomId: z.string().optional().describe("Custom reference identifier"), // PascalCase matches Holded API field name
  code: z.string().optional().describe("Contact code/reference (NIF/CIF/VAT)"),
  tradeName: z.string().optional().describe("Trade/business name"),
  email: z.string().email().optional().describe("Email address"),
  phone: z.string().optional().describe("Phone number"),
  mobile: z.string().optional().describe("Mobile phone number"),
  type: z
    .enum(["client", "supplier", "lead", "debtor", "creditor"])
    .optional()
    .describe("Contact type"),
  isperson: z.boolean().optional().describe("Is this an individual person (true) or company (false)"),
  iban: z.string().optional().describe("Bank IBAN"),
  swift: z.string().optional().describe("Bank SWIFT/BIC code"),
  sepaRef: z.string().optional().describe("SEPA reference"),
  sepaDate: z.number().optional().describe("SEPA date"),
  clientRecord: z.number().int().optional().describe("Client accounting record number"),
  supplierRecord: z.number().int().optional().describe("Supplier accounting record number"),
  taxOperation: z.enum(["general", "intra", "impexp", "nosujeto", "receq", "exento"]).optional().describe("Tax operation type (Spain)"),
  groupId: z.string().optional().describe("Contact group ID"),
  billAddress: AddressSchema.optional().describe("Billing address"),
  shippingAddresses: z.array(ShippingAddressSchema).optional().describe("Shipping addresses"),
  socialNetworks: SocialNetworksSchema,
  defaults: ContactDefaultsSchema,
  numberingSeries: NumberingSeriesSchema.optional(),
  contactPersons: z.array(ContactPersonSchema).optional().describe("Contact persons"),
  tags: TagsSchema,
  note: z.string().optional().describe("Notes about the contact"),
});

export type UpdateContactInput = z.infer<typeof UpdateContactInputSchema>;

/**
 * Delete contact input schema
 */
export const DeleteContactInputSchema = z.strictObject({
  contact_id: IdSchema.describe("The contact ID to delete"),
});

export type DeleteContactInput = z.infer<typeof DeleteContactInputSchema>;

/**
 * List contact groups input schema
 */
export const ListContactGroupsInputSchema = z.strictObject({
  response_format: ResponseFormatSchema,
});

export type ListContactGroupsInput = z.infer<typeof ListContactGroupsInputSchema>;

/**
 * Get contact group input schema
 */
export const GetContactGroupInputSchema = z.strictObject({
  group_id: IdSchema.describe("The contact group ID to retrieve"),
  response_format: ResponseFormatSchema,
});

export type GetContactGroupInput = z.infer<typeof GetContactGroupInputSchema>;

/**
 * Create contact group input schema
 */
export const CreateContactGroupInputSchema = z.strictObject({
  name: z.string().min(1, { message: "Name is required" }).describe("Contact group name (required)"),
  desc: z.string().optional().describe("Group description"),
  color: z.string().optional().describe("Group color (hex code)"),
  pos: z.number().int().optional().describe("Position/order in the list"),
});

export type CreateContactGroupInput = z.infer<typeof CreateContactGroupInputSchema>;

/**
 * Update contact group input schema
 */
export const UpdateContactGroupInputSchema = z.strictObject({
  group_id: IdSchema.describe("The contact group ID to update"),
  name: z.string().min(1).optional().describe("Contact group name"),
  desc: z.string().optional().describe("Group description"),
  color: z.string().optional().describe("Group color (hex code)"),
  pos: z.number().int().optional().describe("Position/order in the list"),
});

export type UpdateContactGroupInput = z.infer<typeof UpdateContactGroupInputSchema>;

/**
 * Delete contact group input schema
 */
export const DeleteContactGroupInputSchema = z.strictObject({
  group_id: IdSchema.describe("The contact group ID to delete"),
});

export type DeleteContactGroupInput = z.infer<typeof DeleteContactGroupInputSchema>;

/**
 * List contact attachments input schema
 */
export const ListContactAttachmentsInputSchema = z.strictObject({
  contact_id: IdSchema.describe("The contact ID to list attachments for"),
  response_format: ResponseFormatSchema,
});

export type ListContactAttachmentsInput = z.infer<typeof ListContactAttachmentsInputSchema>;

/**
 * Get contact attachment input schema
 */
export const GetContactAttachmentInputSchema = z.strictObject({
  contact_id: IdSchema.describe("The contact ID"),
  filename: z.string().min(1, { message: "Filename is required" }).describe("The attachment filename (required)"),
  response_format: ResponseFormatSchema,
});

export type GetContactAttachmentInput = z.infer<typeof GetContactAttachmentInputSchema>;

/**
 * Upload contact attachment input schema.
 *
 * Accepts either a local absolute file path (`file_path`, preferred — avoids
 * base64 token overhead) or a base64-encoded string (`file_content`, legacy).
 * Exactly one source must be provided. With `file_path`, `file_name` is
 * optional and defaults to the path basename.
 */
export const UploadContactAttachmentInputSchema = z
  .strictObject({
    contact_id: IdSchema.describe("The contact ID to upload attachment to"),
    ...attachmentInputFields(),
  })
  .superRefine(attachmentInputSuperRefine);

export type UploadContactAttachmentInput = z.infer<typeof UploadContactAttachmentInputSchema>;
