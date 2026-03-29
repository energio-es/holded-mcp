/**
 * Zod schemas for Task-related operations
 */

import { z } from "zod";
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
} from "../common.js";

/**
 * List tasks input schema
 */
export const ListTasksInputSchema = z.strictObject({
    page: PaginationSchema.shape.page,
    project_id: z.string().optional().describe("Filter by project ID"),
    response_format: ResponseFormatSchema,
  })

export type ListTasksInput = z.infer<typeof ListTasksInputSchema>;

/**
 * Create task input schema
 * 
 * According to the official Holded Projects API v1.2 documentation,
 * task creation requires only: projectId, listId, and name.
 * The listId refers to a task list/column within the project (e.g., "pending", "review", "done").
 * You can get available listIds from the project details (GET /projects/{projectId}).
 * 
 * @see https://developers.holded.com/reference
 * @apiVersion Projects API v1.2
 * @required name, project_id, list_id
 * 
 * @example
 * ```typescript
 * const input = {
 *   name: "Implement feature X",
 *   project_id: "5ab390311d6d82002432ec5a",
 *   list_id: "5ab390311d6d82002432ec52"  // Get from project details
 * };
 * ```
 */
export const CreateTaskInputSchema = z.strictObject({
    name: z.string().min(1, { message: "Name is required" }).describe("Task name (required)"),
    project_id: z.string().min(1, { message: "Project ID is required" }).describe("Project ID to associate the task with (required)"),
    list_id: z.string().min(1, { message: "List ID is required" }).describe("Task list/column ID within the project (required). Get available listIds from the project details."),
  })

export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

/**
 * Get task input schema
 */
export const GetTaskInputSchema = z.strictObject({
    task_id: IdSchema.describe("The task ID to retrieve"),
    response_format: ResponseFormatSchema,
  })

export type GetTaskInput = z.infer<typeof GetTaskInputSchema>;

/**
 * Update task input schema
 * 
 * Note: The Holded API documentation does not explicitly document task updates.
 * This schema includes only the name field as a safe update option.
 * Additional fields may be supported but are not officially documented.
 */
export const UpdateTaskInputSchema = z.strictObject({
    task_id: IdSchema.describe("The task ID to update"),
    name: z.string().min(1).optional().describe("Task name (optional for update)"),
  })

export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;

/**
 * Delete task input schema
 */
export const DeleteTaskInputSchema = z.strictObject({
    task_id: IdSchema.describe("The task ID to delete"),
  })

export type DeleteTaskInput = z.infer<typeof DeleteTaskInputSchema>;
