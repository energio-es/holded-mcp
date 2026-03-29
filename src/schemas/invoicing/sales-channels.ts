/**
 * Zod schemas for Sales Channel-related operations
 */

import { z } from "zod";
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
  OptionalStringSchema,
} from "../common.js";

/**
 * List sales channels input schema
 */
export const ListSalesChannelsInputSchema = z.strictObject({
  page: PaginationSchema.shape.page,
  response_format: ResponseFormatSchema,
});

export type ListSalesChannelsInput = z.infer<typeof ListSalesChannelsInputSchema>;

/**
 * Get sales channel input schema
 */
export const GetSalesChannelInputSchema = z.strictObject({
  sales_channel_id: IdSchema.describe("The sales channel ID to retrieve"),
  response_format: ResponseFormatSchema,
});

export type GetSalesChannelInput = z.infer<typeof GetSalesChannelInputSchema>;

/**
 * Create sales channel input schema
 */
export const CreateSalesChannelInputSchema = z.strictObject({
  name: z.string().min(1, { message: "Name is required" }).describe("Sales channel name (required)"),
  description: OptionalStringSchema.describe("Sales channel description"),
});

export type CreateSalesChannelInput = z.infer<typeof CreateSalesChannelInputSchema>;

/**
 * Update sales channel input schema
 */
export const UpdateSalesChannelInputSchema = z.strictObject({
  sales_channel_id: IdSchema.describe("The sales channel ID to update"),
  name: z.string().min(1).optional().describe("Sales channel name"),
  description: OptionalStringSchema,
});

export type UpdateSalesChannelInput = z.infer<typeof UpdateSalesChannelInputSchema>;

/**
 * Delete sales channel input schema
 */
export const DeleteSalesChannelInputSchema = z.strictObject({
  sales_channel_id: IdSchema.describe("The sales channel ID to delete"),
});

export type DeleteSalesChannelInput = z.infer<typeof DeleteSalesChannelInputSchema>;
