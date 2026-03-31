/**
 * Zod schemas for Account Balances tool
 */

import { z } from "zod";
import { ResponseFormatSchema } from "../common.js";
import {
  accountingDateRangeFields,
  accountingDateRangeRefinement,
  ACCOUNTING_DATE_RANGE_ERROR,
} from "./date-range.js";

/**
 * Account Balances input schema
 *
 * Combines shared date range fields with account-specific options.
 * Accepts either date mode (YYYY-MM-DD) or raw timestamp mode.
 */
export const AccountBalancesInputSchema = z.strictObject({
  ...accountingDateRangeFields,
  account_filter: z
    .array(z.number().int().positive())
    .optional()
    .describe("Filter to specific account numbers (returns all accounts if omitted)"),
  include_opening: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include opening balance entry in totals (default: false, set true for balance sheet)"),
  response_format: ResponseFormatSchema,
}).refine(accountingDateRangeRefinement, { message: ACCOUNTING_DATE_RANGE_ERROR });

export type AccountBalancesInput = z.infer<typeof AccountBalancesInputSchema>;
