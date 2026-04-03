/**
 * Zod schemas for Expenses Account-related operations
 */

import { z } from "zod";
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
} from "../common.js";

/**
 * List expenses accounts input schema
 */
export const ListExpensesAccountsInputSchema = z.strictObject({
  page: PaginationSchema.shape.page,
  response_format: ResponseFormatSchema,
});

export type ListExpensesAccountsInput = z.infer<typeof ListExpensesAccountsInputSchema>;

/**
 * Get expenses account input schema
 */
export const GetExpensesAccountInputSchema = z.strictObject({
  expenses_account_id: IdSchema.describe("The expenses account ID to retrieve"),
  response_format: ResponseFormatSchema,
});

export type GetExpensesAccountInput = z.infer<typeof GetExpensesAccountInputSchema>;

/**
 * Create expenses account input schema
 */
export const CreateExpensesAccountInputSchema = z.strictObject({
  name: z.string().min(1, { message: "Name is required" }).describe("Expenses account name (required)"),
  accountNum: z.number().int().describe("Accounting account number (required)"),
});

export type CreateExpensesAccountInput = z.infer<typeof CreateExpensesAccountInputSchema>;

/**
 * Update expenses account input schema
 */
export const UpdateExpensesAccountInputSchema = z.strictObject({
  expenses_account_id: IdSchema.describe("The expenses account ID to update"),
  name: z.string().min(1).optional().describe("Expenses account name"),
  accountNum: z.number().int().optional().describe("Accounting account number"),
  color: z.string().optional().describe("Color hex code (e.g., #FF5500)"),
});

export type UpdateExpensesAccountInput = z.infer<typeof UpdateExpensesAccountInputSchema>;

/**
 * Delete expenses account input schema
 */
export const DeleteExpensesAccountInputSchema = z.strictObject({
  expenses_account_id: IdSchema.describe("The expenses account ID to delete"),
});

export type DeleteExpensesAccountInput = z.infer<typeof DeleteExpensesAccountInputSchema>;
