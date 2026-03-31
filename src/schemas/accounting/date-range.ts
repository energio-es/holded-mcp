/**
 * Shared Zod fields and validation for accounting date range input.
 *
 * Supports two mutually exclusive modes:
 * - Date mode (default): start_date + end_date as YYYY-MM-DD strings
 * - Raw timestamp mode: starttmp + endtmp as Unix timestamps (opt-in via raw_timestamps: true)
 *
 * Exports reusable fields + refinement so tool schemas can extend without .innerType() hacks.
 */

import { z } from "zod";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Reusable field definitions for accounting date range schemas.
 * Spread into z.strictObject() alongside tool-specific fields.
 */
export const accountingDateRangeFields = {
  start_date: z
    .string()
    .regex(DATE_REGEX, "start_date must be in YYYY-MM-DD format")
    .optional()
    .describe("Period start date in YYYY-MM-DD format (default mode)"),
  end_date: z
    .string()
    .regex(DATE_REGEX, "end_date must be in YYYY-MM-DD format")
    .optional()
    .describe("Period end date in YYYY-MM-DD format (default mode, inclusive)"),
  starttmp: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Period start as Unix timestamp (raw_timestamps mode only)"),
  endtmp: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Period end as Unix timestamp (raw_timestamps mode only)"),
  raw_timestamps: z
    .boolean()
    .default(false)
    .describe("Set to true to use starttmp/endtmp instead of start_date/end_date"),
};

/**
 * Refinement function for date range mutual exclusivity.
 * Works on any object that includes the date range fields.
 */
export function accountingDateRangeRefinement(
  data: { raw_timestamps: boolean; start_date?: string; end_date?: string; starttmp?: number; endtmp?: number },
): boolean {
  if (data.raw_timestamps) {
    if (data.start_date !== undefined || data.end_date !== undefined) return false;
    if (data.starttmp === undefined || data.endtmp === undefined) return false;
    return data.starttmp <= data.endtmp;
  } else {
    if (data.starttmp !== undefined || data.endtmp !== undefined) return false;
    if (data.start_date === undefined || data.end_date === undefined) return false;
    return true;
  }
}

export const ACCOUNTING_DATE_RANGE_ERROR =
  "Invalid date range input. " +
  "Date mode (default): provide start_date and end_date (YYYY-MM-DD), do not include starttmp/endtmp. " +
  "Raw timestamp mode: set raw_timestamps=true with starttmp and endtmp, do not include start_date/end_date. " +
  "In raw mode, starttmp must be <= endtmp.";

/**
 * Standalone schema for direct use (e.g., testing).
 */
export const AccountingDateRangeSchema = z
  .strictObject(accountingDateRangeFields)
  .refine(accountingDateRangeRefinement, { message: ACCOUNTING_DATE_RANGE_ERROR });

export type AccountingDateRange = z.infer<typeof AccountingDateRangeSchema>;
