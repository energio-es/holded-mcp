/**
 * Zod schemas for Event-related operations
 */

import { z } from "zod";
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
  TimestampSchema,
} from "../common.js";

/**
 * List events input schema
 */
export const ListEventsInputSchema = z.strictObject({
  page: PaginationSchema.shape.page,
  response_format: ResponseFormatSchema,
})

export type ListEventsInput = z.infer<typeof ListEventsInputSchema>;

/**
 * Get event input schema
 */
export const GetEventInputSchema = z.strictObject({
  event_id: IdSchema.describe("The event ID to retrieve"),
  response_format: ResponseFormatSchema,
})

export type GetEventInput = z.infer<typeof GetEventInputSchema>;

/**
 * Create event input schema
 */
export const CreateEventInputSchema = z.strictObject({
  name: z.string().min(1, { message: "Name is required" }).describe("Event name (required)"),
  startDate: TimestampSchema.describe("Start time as Unix timestamp (required)"),
  duration: z.number().int().positive().optional().describe("Duration in seconds"),
  desc: z.string().optional().describe("Event description"),
  leadId: z.string().optional().describe("Associated lead ID"),
  contactId: z.string().optional().describe("Associated contact ID"),
  userId: z.string().optional().describe("User ID to assign the event to"),
})

export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;

/**
 * Update event input schema
 */
export const UpdateEventInputSchema = z.strictObject({
  event_id: IdSchema.describe("The event ID to update"),
  name: z.string().min(1).optional().describe("Event name"),
  startDate: TimestampSchema.describe("Start time as Unix timestamp"),
  duration: z.number().int().positive().optional().describe("Duration in seconds"),
  desc: z.string().optional().describe("Event description"),
  leadId: z.string().optional().describe("Associated lead ID"),
  contactId: z.string().optional().describe("Associated contact ID"),
  userId: z.string().optional().describe("User ID to assign the event to"),
})

export type UpdateEventInput = z.infer<typeof UpdateEventInputSchema>;

/**
 * Delete event input schema
 */
export const DeleteEventInputSchema = z.strictObject({
  event_id: IdSchema.describe("The event ID to delete"),
})

export type DeleteEventInput = z.infer<typeof DeleteEventInputSchema>;
