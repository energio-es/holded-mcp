/**
 * Zod schemas for Remittance-related operations
 */

import { z } from "zod";
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
} from "../common.js";

/**
 * List remittances input schema
 */
export const ListRemittancesInputSchema = z.strictObject({
  page: PaginationSchema.shape.page,
  response_format: ResponseFormatSchema,
});

export type ListRemittancesInput = z.infer<typeof ListRemittancesInputSchema>;

/**
 * Get remittance input schema
 */
export const GetRemittanceInputSchema = z.strictObject({
  remittance_id: IdSchema.describe("The remittance ID to retrieve"),
  response_format: ResponseFormatSchema,
});

export type GetRemittanceInput = z.infer<typeof GetRemittanceInputSchema>;
