/**
 * Zod schemas for Booking-related operations
 * 
 * API Version: CRM API v1.0
 * Documentation: https://developers.holded.com/reference
 */

import { z } from "zod";
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
} from "../common.js";

/**
 * List bookings input schema
 */
export const ListBookingsInputSchema = z.strictObject({
    page: PaginationSchema.shape.page,
    response_format: ResponseFormatSchema,
  })

export type ListBookingsInput = z.infer<typeof ListBookingsInputSchema>;

/**
 * Custom field schema for bookings
 */
export const BookingCustomFieldSchema = z.strictObject({
  key: z.string().describe("Custom field key"),
  value: z.string().describe("Custom field value"),
});

/**
 * Create booking input schema
 * 
 * Per Holded CRM API v1.0 documentation:
 * Required fields: locationId, serviceId, dateTime, timezone, language, customFields
 * 
 * @see https://developers.holded.com/reference
 * @apiVersion CRM API v1.0
 * @required locationId, serviceId, dateTime, timezone, language, customFields
 * 
 * @example
 * ```typescript
 * const input = {
 *   locationId: "6710e0b21ab397666906c6f4",
 *   serviceId: "66704f4a0ace9fc5e30078b5",
 *   dateTime: 1730109600,  // Unix timestamp
 *   timezone: "Europe/Madrid",
 *   language: "es",
 *   customFields: [
 *     { key: "name", value: "John Doe" },
 *     { key: "email", value: "john@example.com" }
 *   ]
 * };
 * ```
 */
export const CreateBookingInputSchema = z.strictObject({
    locationId: z.string().min(1, { message: "Location ID is required" }).describe("Location ID for the booking (required)"),
    serviceId: z.string().min(1, { message: "Service ID is required" }).describe("Service ID for the booking (required)"),
    dateTime: z.number().int().positive({ message: "DateTime must be a positive integer" }).describe("Booking date and time as Unix timestamp (required)"),
    timezone: z.string().min(1, { message: "Timezone is required" }).describe("Timezone (e.g., 'Europe/Luxembourg') (required)"),
    language: z.string().min(1, { message: "Language is required" }).describe("Language code (e.g., 'es', 'en') (required)"),
    customFields: z.array(BookingCustomFieldSchema).min(1, { message: "At least one custom field is required" }).describe("Array of custom fields with key-value pairs (required) - typically includes 'name' and 'email' fields"),
  })

export type CreateBookingInput = z.infer<typeof CreateBookingInputSchema>;

/**
 * Update booking input schema
 */
export const UpdateBookingInputSchema = z.strictObject({
    booking_id: IdSchema.describe("The booking ID to update"),
    dateTime: z.number().int().positive().optional().describe("Booking date and time as Unix timestamp"),
    customFields: z.array(BookingCustomFieldSchema).optional().describe("Array of custom fields with key-value pairs"),
  })

export type UpdateBookingInput = z.infer<typeof UpdateBookingInputSchema>;

/**
 * List booking locations input schema
 */
export const ListBookingLocationsInputSchema = z.strictObject({
    response_format: ResponseFormatSchema,
  })

export type ListBookingLocationsInput = z.infer<typeof ListBookingLocationsInputSchema>;

/**
 * Get booking input schema
 */
export const GetBookingInputSchema = z.strictObject({
    booking_id: IdSchema.describe("The booking ID to retrieve"),
    response_format: ResponseFormatSchema,
  })

export type GetBookingInput = z.infer<typeof GetBookingInputSchema>;

/**
 * Delete booking input schema
 */
export const DeleteBookingInputSchema = z.strictObject({
    booking_id: IdSchema.describe("The booking ID to delete"),
  })

export type DeleteBookingInput = z.infer<typeof DeleteBookingInputSchema>;

/**
 * Get available slots input schema
 * 
 * According to Holded API documentation, both serviceId and day are required:
 * - serviceId (string): Specific service ID
 * - day (string): Specific day in yyyy-mm-dd format
 */
export const GetAvailableSlotsInputSchema = z.strictObject({
    location_id: IdSchema.describe("The location ID (required)"),
    serviceId: z.string().min(1, { message: "Service ID is required" }).describe("Service ID (required)"),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Day must be in yyyy-mm-dd format" }).describe("Day in yyyy-mm-dd format (required)"),
    response_format: ResponseFormatSchema,
  })

export type GetAvailableSlotsInput = z.infer<typeof GetAvailableSlotsInputSchema>;
