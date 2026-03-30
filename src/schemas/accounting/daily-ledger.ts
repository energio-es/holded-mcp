/**
 * Zod schemas for Daily Ledger-related operations
 */

import { z } from "zod";
import {
  PaginationSchema,
  ResponseFormatSchema,
} from "../common.js";

/**
 * List daily ledger entries input schema
 *
 * The API requires starttmp and endtmp (requests without them are rejected).
 */
export const ListDailyLedgerInputSchema = z.strictObject({
    starttmp: z.number().int().positive().describe("Starting timestamp as Unix timestamp (required, filters entries from this date)"),
    endtmp: z.number().int().positive().describe("Ending timestamp as Unix timestamp (required, filters entries until this date)"),
    page: PaginationSchema.shape.page,
    response_format: ResponseFormatSchema,
  }).refine(
    (data) => data.starttmp <= data.endtmp,
    {
      message: "starttmp must be less than or equal to endtmp (start date cannot be after end date)",
    }
  )

export type ListDailyLedgerInput = z.infer<typeof ListDailyLedgerInputSchema>;

/**
 * Entry line schema for create entry
 * 
 * According to Holded API documentation, `account` must be an integer (account number).
 */
export const EntryLineSchema = z.strictObject({
  account: z.number().int().positive({ message: "Account must be a positive integer" }).describe("Accounting account number (required, integer)"),
  debit: z.number().min(0).optional().describe("Debit amount (cannot have both debit and credit)"),
  credit: z.number().min(0).optional().describe("Credit amount (cannot have both debit and credit)"),
  description: z.string().optional().describe("Line description"),
  tags: z.array(z.string()).optional().describe("Array of tags for this entry line"),
});

/**
 * Create daily ledger entry input schema
 */
export const CreateEntryInputSchema = z.strictObject({
  date: z.number().int().positive().describe("Entry date as Unix timestamp (required)"),
  lines: z.array(EntryLineSchema).min(2, { message: "At least 2 entry lines are required" }).describe("Array of entry lines (required, minimum 2 lines)"),
  notes: z.string().optional().describe("Entry note"),
}).refine(
  (data) => {
    // Validate that each line has either debit or credit, but not both
    for (const line of data.lines) {
      const hasDebit = line.debit !== undefined && line.debit > 0;
      const hasCredit = line.credit !== undefined && line.credit > 0;
      if (hasDebit && hasCredit) {
        return false; // Cannot have both
      }
      if (!hasDebit && !hasCredit) {
        return false; // Must have at least one
      }
    }
    // Validate that total debits equal total credits
    const totalDebits = data.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredits = data.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    return Math.abs(totalDebits - totalCredits) < 0.01; // Allow small floating point differences
  },
  {
    message: "Each line must have either debit or credit (not both), and total debits must equal total credits",
  }
)

export type EntryLine = z.infer<typeof EntryLineSchema>;
export type CreateEntryInput = z.infer<typeof CreateEntryInputSchema>;
