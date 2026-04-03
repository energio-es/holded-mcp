/**
 * Zod schemas for Warehouse-related operations
 */

import { z } from "zod";
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
  AddressSchema,
} from "../common.js";

/**
 * List warehouses input schema
 */
export const ListWarehousesInputSchema = z.strictObject({
  page: PaginationSchema.shape.page,
  response_format: ResponseFormatSchema,
});

export type ListWarehousesInput = z.infer<typeof ListWarehousesInputSchema>;

/**
 * Get warehouse input schema
 */
export const GetWarehouseInputSchema = z.strictObject({
  warehouse_id: IdSchema.describe("The warehouse ID to retrieve"),
  response_format: ResponseFormatSchema,
});

export type GetWarehouseInput = z.infer<typeof GetWarehouseInputSchema>;

/**
 * Create warehouse input schema
 */
export const CreateWarehouseInputSchema = z.strictObject({
  name: z.string().min(1, { message: "Name is required" }).describe("Warehouse name (required)"),
  address: AddressSchema.optional().describe("Warehouse address"),
  default: z.boolean().optional().describe("Whether this is the default warehouse"),
  email: z.string().email().optional().describe("Warehouse email"),
  phone: z.string().optional().describe("Warehouse phone number"),
  mobile: z.string().optional().describe("Warehouse mobile number"),
});

export type CreateWarehouseInput = z.infer<typeof CreateWarehouseInputSchema>;

/**
 * Update warehouse input schema
 */
export const UpdateWarehouseInputSchema = z.strictObject({
  warehouse_id: IdSchema.describe("The warehouse ID to update"),
  name: z.string().min(1).optional().describe("Warehouse name"),
  address: AddressSchema.optional(),
  default: z.boolean().optional().describe("Whether this is the default warehouse"),
  email: z.string().email().optional().describe("Warehouse email"),
  phone: z.string().optional().describe("Warehouse phone number"),
  mobile: z.string().optional().describe("Warehouse mobile number"),
});

export type UpdateWarehouseInput = z.infer<typeof UpdateWarehouseInputSchema>;

/**
 * Delete warehouse input schema
 */
export const DeleteWarehouseInputSchema = z.strictObject({
  warehouse_id: IdSchema.describe("The warehouse ID to delete"),
});

export type DeleteWarehouseInput = z.infer<typeof DeleteWarehouseInputSchema>;
