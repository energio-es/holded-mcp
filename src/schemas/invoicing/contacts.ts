/**
 * Zod schemas for Contact-related operations
 */

import { z } from "zod";
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
  AddressSchema,
  TagsSchema,
} from "../common.js";

/**
 * List contacts input schema
 */
export const ListContactsInputSchema = z.strictObject({
  page: PaginationSchema.shape.page,
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
    paymentMethod: z.string().optional().describe("Default payment method"),
    paymentDay: z.number().int().min(1).max(31).optional().describe("Default payment day of month"),
    dueDays: z.number().int().min(0).optional().describe("Default due days"),
  })
  .optional();

/**
 * Create contact input schema
 */
export const CreateContactInputSchema = z.strictObject({
  name: z.string().min(1, { message: "Name is required" }).describe("Contact name (required)"),
  code: z.string().optional().describe("Contact code/reference"),
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
  billAddress: AddressSchema.optional().describe("Billing address"),
  shippingAddresses: z.array(AddressSchema).optional().describe("Shipping addresses"),
  socialNetworks: SocialNetworksSchema,
  defaults: ContactDefaultsSchema,
  tags: TagsSchema,
  note: z.string().optional().describe("Notes about the contact"),
  groupId: z.string().optional().describe("Contact group ID"),
});

export type CreateContactInput = z.infer<typeof CreateContactInputSchema>;

/**
 * Update contact input schema
 */
export const UpdateContactInputSchema = z.strictObject({
  contact_id: IdSchema.describe("The contact ID to update"),
  name: z.string().min(1).optional().describe("Contact name"),
  code: z.string().optional().describe("Contact code/reference"),
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
  billAddress: AddressSchema.optional().describe("Billing address"),
  shippingAddresses: z.array(AddressSchema).optional().describe("Shipping addresses"),
  socialNetworks: SocialNetworksSchema,
  defaults: ContactDefaultsSchema,
  groupId: z.string().optional().describe("Contact group ID"),
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
 * Upload contact attachment input schema
 */
export const UploadContactAttachmentInputSchema = z.strictObject({
  contact_id: IdSchema.describe("The contact ID to upload attachment to"),
  file_content: z.string().min(1, { message: "File content is required" }).describe("File content as base64 encoded string (required)"),
  file_name: z.string().min(1, { message: "File name is required" }).describe("File name (required)"),
});

export type UploadContactAttachmentInput = z.infer<typeof UploadContactAttachmentInputSchema>;
