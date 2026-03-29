/**
 * Zod schemas for Numbering Series-related operations
 */

import { z } from "zod";
import {
  IdSchema,
  ResponseFormatSchema,
  DocumentTypeSchema,
} from "../common.js";

/**
 * Get numbering series input schema
 */
export const GetNumberingSeriesInputSchema = z.strictObject({
  doc_type: DocumentTypeSchema,
  response_format: ResponseFormatSchema,
})

export type GetNumberingSeriesInput = z.infer<typeof GetNumberingSeriesInputSchema>;

/**
 * Create numbering series input schema
 * 
 * Note: According to Holded Invoice API v1.4, all fields are optional
 * (no required array in the OpenAPI spec)
 */
export const CreateNumberingSeriesInputSchema = z.strictObject({
  doc_type: DocumentTypeSchema,
  name: z.string().optional().describe("Series name"),
  format: z.string().optional().describe("Format string for document numbers (e.g., 'F17%%%%')"),
  last: z.number().int().optional().describe("Last number used in the series"),
  type: z.string().optional().describe("Document type (optional, already in path)"),
})

export type CreateNumberingSeriesInput = z.infer<typeof CreateNumberingSeriesInputSchema>;

/**
 * Update numbering series input schema
 */
export const UpdateNumberingSeriesInputSchema = z.strictObject({
  doc_type: DocumentTypeSchema,
  numbering_series_id: IdSchema.describe("The numbering series ID to update"),
  name: z.string().min(1).optional().describe("Series name"),
  format: z.string().optional().describe("Format string for document numbers"),
  last: z.string().optional().describe("Last number used in the series (string format)"),
})

export type UpdateNumberingSeriesInput = z.infer<typeof UpdateNumberingSeriesInputSchema>;

/**
 * Delete numbering series input schema
 */
export const DeleteNumberingSeriesInputSchema = z.strictObject({
  doc_type: DocumentTypeSchema,
  numbering_series_id: IdSchema.describe("The numbering series ID to delete"),
})

export type DeleteNumberingSeriesInput = z.infer<typeof DeleteNumberingSeriesInputSchema>;
