/**
 * Zod schemas for Funnel-related operations
 */

import { z } from "zod";
import {
  IdSchema,
  ResponseFormatSchema,
} from "../common.js";

/**
 * List funnels input schema
 */
export const ListFunnelsInputSchema = z.strictObject({
  response_format: ResponseFormatSchema,
})

export type ListFunnelsInput = z.infer<typeof ListFunnelsInputSchema>;

/**
 * Funnel stage schema
 */
export const FunnelStageSchema = z.strictObject({
  name: z.string().min(1).describe("Stage name (required)"),
  order: z.number().int().min(0).optional().describe("Stage order/position"),
  probability: z.number().min(0).max(100).optional().describe("Default probability (0-100%)"),
})

/**
 * Create funnel input schema
 */
export const CreateFunnelInputSchema = z.strictObject({
  name: z.string().min(1, { message: "Name is required" }).describe("Funnel name (required)"),
  stages: z.array(FunnelStageSchema).optional().describe("Initial funnel stages"),
})

export type CreateFunnelInput = z.infer<typeof CreateFunnelInputSchema>;

/**
 * Update funnel input schema
 */
export const UpdateFunnelInputSchema = z.strictObject({
  funnel_id: IdSchema.describe("The funnel ID to update"),
  name: z.string().min(1).optional().describe("Funnel name"),
  stages: z.array(FunnelStageSchema).optional().describe("Updated funnel stages"),
})

export type UpdateFunnelInput = z.infer<typeof UpdateFunnelInputSchema>;

/**
 * Get funnel input schema
 */
export const GetFunnelInputSchema = z.strictObject({
  funnel_id: IdSchema.describe("The funnel ID to retrieve"),
  response_format: ResponseFormatSchema,
})

export type GetFunnelInput = z.infer<typeof GetFunnelInputSchema>;

/**
 * Delete funnel input schema
 */
export const DeleteFunnelInputSchema = z.strictObject({
  funnel_id: IdSchema.describe("The funnel ID to delete"),
})

export type DeleteFunnelInput = z.infer<typeof DeleteFunnelInputSchema>;
