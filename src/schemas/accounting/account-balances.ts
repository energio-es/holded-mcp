/**
 * Zod schemas for Account Balances tool
 */

import { z } from "zod";
import { ResponseFormatSchema } from "../common.js";

/**
 * Account Balances input schema
 *
 * Both starttmp and endtmp are required — the tool aggregates ledger entries
 * within this date range and filters out cross-fiscal-year leakage.
 */
export const AccountBalancesInputSchema = z.strictObject({
  starttmp: z.number().int().positive().describe("Period start as Unix timestamp (required)"),
  endtmp: z.number().int().positive().describe("Period end as Unix timestamp (required)"),
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
}).refine(
  (data) => data.starttmp <= data.endtmp,
  {
    message: "starttmp must be less than or equal to endtmp (start date cannot be after end date)",
  }
);

export type AccountBalancesInput = z.infer<typeof AccountBalancesInputSchema>;
