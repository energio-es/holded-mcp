/**
 * Zod schemas for Services operations
 */

import { z } from "zod";
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
} from "../common.js";

/**
 * List services input schema
 */
export const ListServicesInputSchema = z.strictObject({
  page: PaginationSchema.shape.page,
  response_format: ResponseFormatSchema,
});

export type ListServicesInput = z.infer<typeof ListServicesInputSchema>;

/**
 * Get service input schema
 */
export const GetServiceInputSchema = z.strictObject({
  service_id: IdSchema.describe("The service ID to retrieve"),
  response_format: ResponseFormatSchema,
});

export type GetServiceInput = z.infer<typeof GetServiceInputSchema>;

/**
 * Create service input schema
 */
export const CreateServiceInputSchema = z.strictObject({
  name: z.string().min(1, { message: "Name is required" }).describe("Service name (required)"),
  desc: z.string().optional().describe("Service description"),
  tags: z.array(z.string()).optional().describe("Service tags"),
  tax: z.number().optional().describe("Tax rate"),
  subtotal: z.number().int().optional().describe("Subtotal in cents"),
  salesChannelId: z.string().optional().describe("Sales channel ID"),
  cost: z.number().optional().describe("Service cost"),
});

export type CreateServiceInput = z.infer<typeof CreateServiceInputSchema>;

/**
 * Update service input schema
 */
export const UpdateServiceInputSchema = z.strictObject({
  service_id: IdSchema.describe("The service ID to update"),
  name: z.string().min(1).optional().describe("Service name"),
  desc: z.string().optional().describe("Service description"),
  tags: z.array(z.string()).optional().describe("Service tags"),
  tax: z.number().optional().describe("Tax rate"),
  subtotal: z.number().int().optional().describe("Subtotal in cents"),
  salesChannelId: z.string().optional().describe("Sales channel ID"),
  cost: z.number().optional().describe("Service cost"),
});

export type UpdateServiceInput = z.infer<typeof UpdateServiceInputSchema>;

/**
 * Delete service input schema
 */
export const DeleteServiceInputSchema = z.strictObject({
  service_id: IdSchema.describe("The service ID to delete"),
});

export type DeleteServiceInput = z.infer<typeof DeleteServiceInputSchema>;
