/**
 * Zod schemas for Payment-related operations
 */

import { z } from "zod";
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
  TimestampSchema,
} from "../common.js";
import { accountingDateRangeFields } from "../accounting/date-range.js";

/**
 * Create payment input schema
 */
export const CreatePaymentInputSchema = z.strictObject({
    contact_id: z.string().optional().describe("The contact ID to apply the payment to"),
    amount: z.number().positive().describe("Payment amount"),
    date: TimestampSchema.describe("Payment date as Unix timestamp"),
    account_id: z.string().optional().describe("Treasury/Bank account ID"),
    desc: z.string().optional().describe("Payment description"),
  })

export type CreatePaymentInput = z.infer<typeof CreatePaymentInputSchema>;

/**
 * List payments input schema
 */
export const ListPaymentsInputSchema = z.strictObject({
    page: PaginationSchema.shape.page,
    ...accountingDateRangeFields,
    response_format: ResponseFormatSchema,
  })

export type ListPaymentsInput = z.infer<typeof ListPaymentsInputSchema>;

/**
 * Get payment input schema
 */
export const GetPaymentInputSchema = z.strictObject({
    payment_id: IdSchema.describe("The payment ID to retrieve"),
    response_format: ResponseFormatSchema,
  })

export type GetPaymentInput = z.infer<typeof GetPaymentInputSchema>;

/**
 * Update payment input schema
 */
export const UpdatePaymentInputSchema = z.strictObject({
    payment_id: IdSchema.describe("The payment ID to update"),
    amount: z.number().positive().optional().describe("Payment amount"),
    date: TimestampSchema.describe("Payment date as Unix timestamp"),
    account_id: z.string().optional().describe("Treasury/Bank account ID"),
    desc: z.string().optional().describe("Payment description"),
  })

export type UpdatePaymentInput = z.infer<typeof UpdatePaymentInputSchema>;

/**
 * Delete payment input schema
 */
export const DeletePaymentInputSchema = z.strictObject({
    payment_id: IdSchema.describe("The payment ID to delete"),
  })

export type DeletePaymentInput = z.infer<typeof DeletePaymentInputSchema>;
