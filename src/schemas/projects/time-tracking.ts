/**
 * Zod schemas for Project Time Tracking operations
 */

import { z } from "zod";
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
  OptionalStringSchema,
  OptionalBooleanSchema,
} from "../common.js";

/**
 * List project time-trackings input schema
 */
export const ListProjectTimeTrackingsInputSchema = z.strictObject({
  project_id: IdSchema.describe("The project ID"),
  page: PaginationSchema.shape.page,
  response_format: ResponseFormatSchema,
});

export type ListProjectTimeTrackingsInput = z.infer<typeof ListProjectTimeTrackingsInputSchema>;

/**
 * Create project time-tracking input schema
 * 
 * Per Holded Projects API v1.2:
 * - duration: Duration in seconds (required)
 * - costHour: Cost per hour (required)
 * - desc: Description (optional)
 * - userId: User/Employee ID (required)
 * - taskId: Task ID (optional)
 */
export const CreateProjectTimeTrackingInputSchema = z.strictObject({
  project_id: IdSchema.describe("The project ID (required)"),
  duration: z.number().int().describe("Duration in seconds (required)"),
  costHour: z.number().int().describe("Cost per hour (required)"),
  desc: OptionalStringSchema.describe("Description of work"),
  userId: z.string().min(1).describe("User/Employee ID (required)"),
  taskId: OptionalStringSchema.describe("Task ID"),
});

export type CreateProjectTimeTrackingInput = z.infer<typeof CreateProjectTimeTrackingInputSchema>;

/**
 * Update project time-tracking input schema
 * 
 * Per Holded Projects API v1.2:
 * - duration: Duration in seconds (optional for update)
 * - costHour: Cost per hour (optional for update)
 * - desc: Description (optional)
 * - userId: User/Employee ID (optional)
 * - taskId: Task ID (optional)
 */
export const UpdateProjectTimeTrackingInputSchema = z.strictObject({
  project_id: IdSchema.describe("The project ID"),
  time_id: IdSchema.describe("The time-tracking ID to update"),
  duration: z.number().int().optional().describe("Duration in seconds"),
  costHour: z.number().int().optional().describe("Cost per hour"),
  desc: OptionalStringSchema.describe("Description of work"),
  userId: OptionalStringSchema.describe("User/Employee ID"),
  taskId: OptionalStringSchema.describe("Task ID"),
});

export type UpdateProjectTimeTrackingInput = z.infer<typeof UpdateProjectTimeTrackingInputSchema>;

/**
 * Delete project time-tracking input schema
 */
export const DeleteProjectTimeTrackingInputSchema = z.strictObject({
  project_id: IdSchema.describe("The project ID"),
  time_id: IdSchema.describe("The time-tracking ID to delete"),
});

export type DeleteProjectTimeTrackingInput = z.infer<typeof DeleteProjectTimeTrackingInputSchema>;

/**
 * Get project time-tracking input schema
 */
export const GetProjectTimeTrackingInputSchema = z.strictObject({
  project_id: IdSchema.describe("The project ID"),
  time_id: IdSchema.describe("The time-tracking ID to retrieve"),
  response_format: ResponseFormatSchema,
});

export type GetProjectTimeTrackingInput = z.infer<typeof GetProjectTimeTrackingInputSchema>;

/**
 * List all project times input schema
 */
export const ListAllProjectTimesInputSchema = z.strictObject({
  start: z.number().int().optional().describe("Start date as Unix timestamp"),
  end: z.number().int().optional().describe("End date as Unix timestamp"),
  archived: OptionalBooleanSchema.describe("Include archived projects"),
  response_format: ResponseFormatSchema,
});

export type ListAllProjectTimesInput = z.infer<typeof ListAllProjectTimesInputSchema>;
