/**
 * Zod schemas for Accounting Account-related operations
 */

import { z } from "zod";
import {
  ResponseFormatSchema,
} from "../common.js";
import {
  accountingDateRangeFields,
  optionalAccountingDateRangeRefinement,
  ACCOUNTING_DATE_RANGE_ERROR,
} from "./date-range.js";

/**
 * List accounting accounts input schema
 */
export const ListAccountingAccountsInputSchema = z.strictObject({
    response_format: ResponseFormatSchema,
    include_empty: z.boolean().optional().describe("Include accounts with zero balance (API default: false)"),
    ...accountingDateRangeFields,
  }).refine(optionalAccountingDateRangeRefinement, { message: ACCOUNTING_DATE_RANGE_ERROR })

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
    color: z.string().optional().describe("Account color as hex code (e.g., #FF0000)"),
  })

export type CreateAccountInput = z.infer<typeof CreateAccountInputSchema>;
