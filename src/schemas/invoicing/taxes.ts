/**
 * Zod schemas for Taxes operations
 */

import { z } from "zod";
import {
  ResponseFormatSchema,
} from "../common.js";

/**
 * Get taxes input schema
 */
export const GetTaxesInputSchema = z.strictObject({
  response_format: ResponseFormatSchema,
});

export type GetTaxesInput = z.infer<typeof GetTaxesInputSchema>;
