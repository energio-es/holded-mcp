/**
 * Zod schemas for Accounting Account-related operations
 */

import { z } from "zod";
import {
  PaginationSchema,
  ResponseFormatSchema,
} from "../common.js";
import { accountingDateRangeFields } from "./date-range.js";

/**
 * List accounting accounts input schema
 */
export const ListAccountingAccountsInputSchema = z.strictObject({
    page: PaginationSchema.shape.page,
    response_format: ResponseFormatSchema,
    include_empty: z.boolean().optional().default(true).describe("Include accounts with zero balance in the scoped period (default: true)"),
    ...accountingDateRangeFields,
  })

export type ListAccountingAccountsInput = z.infer<typeof ListAccountingAccountsInputSchema>;

/**
 * Create accounting account input schema
 */
export const CreateAccountInputSchema = z.strictObject({
    prefix: z
      .number()
      .int()
      .min(1000)
      .max(9999)
      .describe("4-digit prefix for the account code (required, e.g., 7000 for sales)"),
    name: z.string().optional().describe("Account name (uses parent account name if not provided)"),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { message: "Color must be a valid hex code (e.g., #FF0000)" }).optional().describe("Account color as hex code (e.g., #FF0000)"),
  })

export type CreateAccountInput = z.infer<typeof CreateAccountInputSchema>;
