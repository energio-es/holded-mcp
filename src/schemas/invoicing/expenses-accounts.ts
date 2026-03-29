/**
 * Zod schemas for Expenses Account-related operations
 */

import { z } from "zod";
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
  OptionalStringSchema,
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
  code: OptionalStringSchema.describe("Account code"),
  description: OptionalStringSchema.describe("Account description"),
});

export type CreateExpensesAccountInput = z.infer<typeof CreateExpensesAccountInputSchema>;

/**
 * Update expenses account input schema
 */
export const UpdateExpensesAccountInputSchema = z.strictObject({
  expenses_account_id: IdSchema.describe("The expenses account ID to update"),
  name: z.string().min(1).optional().describe("Expenses account name"),
  code: OptionalStringSchema,
  description: OptionalStringSchema,
});

export type UpdateExpensesAccountInput = z.infer<typeof UpdateExpensesAccountInputSchema>;

/**
 * Delete expenses account input schema
 */
export const DeleteExpensesAccountInputSchema = z.strictObject({
  expenses_account_id: IdSchema.describe("The expenses account ID to delete"),
});

export type DeleteExpensesAccountInput = z.infer<typeof DeleteExpensesAccountInputSchema>;
