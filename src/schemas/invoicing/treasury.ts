/**
 * Zod schemas for Treasury-related operations
 */

import { z } from "zod";
import {
  IdSchema,
  ResponseFormatSchema,
} from "../common.js";

/**
 * Create treasury input schema
 */
export const CreateTreasuryInputSchema = z.strictObject({
  id: z.string().optional().describe("Treasury account ID (optional, auto-generated if not provided)"),
  name: z.string().min(1, { message: "Name is required" }).describe("Treasury account name (required)"),
  type: z.string().optional().describe("Account type (e.g., 'bank', 'cash', 'creditcard')"),
  balance: z.number().int().optional().describe("Initial balance"),
  accountNumber: z.number().int().optional().describe("Accounting account number. If blank, a new account with prefix 572 will be created"),
  iban: z.string().optional().describe("Bank IBAN"),
  swift: z.string().optional().describe("Bank SWIFT/BIC code"),
  bank: z.string().optional().describe("Bank identifier"),
  bankname: z.string().optional().describe("Bank name"),
})

export type CreateTreasuryInput = z.infer<typeof CreateTreasuryInputSchema>;

/**
 * List payment methods input schema
 */
export const ListPaymentMethodsInputSchema = z.strictObject({
  response_format: ResponseFormatSchema,
})

export type ListPaymentMethodsInput = z.infer<typeof ListPaymentMethodsInputSchema>;

/**
 * List treasuries input schema
 */
export const ListTreasuriesInputSchema = z.strictObject({
  response_format: ResponseFormatSchema,
})

export type ListTreasuriesInput = z.infer<typeof ListTreasuriesInputSchema>;

/**
 * Get treasury input schema
 */
export const GetTreasuryInputSchema = z.strictObject({
  treasury_id: IdSchema.describe("The treasury account ID to retrieve"),
  response_format: ResponseFormatSchema,
})

export type GetTreasuryInput = z.infer<typeof GetTreasuryInputSchema>;
