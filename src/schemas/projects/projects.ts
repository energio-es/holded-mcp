/**
 * Zod schemas for Project-related operations
 * 
 * API Version: Projects API v1.2
 * Documentation: https://developers.holded.com/reference
 */

import { z } from "zod";
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
} from "../common.js";

/**
 * List projects input schema
 */
export const ListProjectsInputSchema = z.strictObject({
  page: PaginationSchema.shape.page,
  response_format: ResponseFormatSchema,
})

export type ListProjectsInput = z.infer<typeof ListProjectsInputSchema>;

/**
 * Create project input schema
 * 
 * Per Holded Projects API v1.2 documentation:
 * Only `name` is a documented required field for project creation.
 */
export const CreateProjectInputSchema = z.strictObject({
  name: z.string().min(1, { message: "Name is required" }).describe("Project name (required)"),
})

export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

/**
 * Get project input schema
 */
export const GetProjectInputSchema = z.strictObject({
  project_id: IdSchema.describe("The project ID to retrieve"),
  response_format: ResponseFormatSchema,
})

export type GetProjectInput = z.infer<typeof GetProjectInputSchema>;

/**
 * Update project input schema
 * 
 * Per Holded Projects API v1.2 documentation:
 * Only `name` is documented for project updates.
 */
export const UpdateProjectInputSchema = z.strictObject({
  project_id: IdSchema.describe("The project ID to update"),
  name: z.string().min(1).optional().describe("Project name"),
})

export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;

/**
 * Delete project input schema
 */
export const DeleteProjectInputSchema = z.strictObject({
  project_id: IdSchema.describe("The project ID to delete"),
})

export type DeleteProjectInput = z.infer<typeof DeleteProjectInputSchema>;

/**
 * Get project summary input schema
 */
export const GetProjectSummaryInputSchema = z.strictObject({
  project_id: IdSchema.describe("The project ID to get summary for"),
  response_format: ResponseFormatSchema,
})

export type GetProjectSummaryInput = z.infer<typeof GetProjectSummaryInputSchema>;
