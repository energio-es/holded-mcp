/**
 * Zod schemas for Lead-related operations
 */

import { z } from "zod";
import {
  IdSchema,
  PaginationSchema,
  ResponseFormatSchema,
  TimestampSchema,
} from "../common.js";

/**
 * List leads input schema
 */
export const ListLeadsInputSchema = z.strictObject({
  page: PaginationSchema.shape.page,
  funnel_id: z.string().optional().describe("Filter by funnel ID"),
  response_format: ResponseFormatSchema,
})

export type ListLeadsInput = z.infer<typeof ListLeadsInputSchema>;

/**
 * Get lead input schema
 */
export const GetLeadInputSchema = z.strictObject({
  lead_id: IdSchema.describe("The lead ID to retrieve"),
  response_format: ResponseFormatSchema,
})

export type GetLeadInput = z.infer<typeof GetLeadInputSchema>;

/**
 * Create lead input schema
 */
export const CreateLeadInputSchema = z.strictObject({
  name: z.string().min(1, { message: "Name is required" }).describe("Lead name (required)"),
  funnel_id: z.string().min(1, { message: "Funnel ID is required" }).describe("Funnel ID to place the lead in (required)"),
  contact_id: z.string().min(1, { message: "Contact ID is required" }).describe("Associated contact ID (required)"),
  stage_id: z.string().optional().describe("Stage ID within the funnel"),
  contact_name: z.string().optional().describe("Contact name"),
  value: z.number().min(0).optional().describe("Monetary value of the lead"),
  due_date: TimestampSchema.describe("Due date as Unix timestamp"),
})

export type CreateLeadInput = z.infer<typeof CreateLeadInputSchema>;

/**
 * Update lead input schema
 */
export const UpdateLeadInputSchema = z.strictObject({
  lead_id: IdSchema.describe("The lead ID to update"),
  name: z.string().min(1).optional().describe("Lead name"),
  value: z.number().min(0).optional().describe("Monetary value of the lead"),
  due_date: TimestampSchema.describe("Due date as Unix timestamp"),
  status: z.number().int().optional().describe("Lead status indicator"),
  customFields: z.array(z.strictObject({
    field: z.string().describe("Custom field name"),
    value: z.string().describe("Custom field value"),
  })).optional().describe("Custom field key-value pairs"),
})

export type UpdateLeadInput = z.infer<typeof UpdateLeadInputSchema>;

/**
 * Delete lead input schema
 */
export const DeleteLeadInputSchema = z.strictObject({
  lead_id: IdSchema.describe("The lead ID to delete"),
})

export type DeleteLeadInput = z.infer<typeof DeleteLeadInputSchema>;

/**
 * Update lead stage input schema
 */
export const UpdateLeadStageInputSchema = z.strictObject({
  lead_id: IdSchema.describe("The lead ID to move"),
  stage_id: IdSchema.describe("The target stage ID"),
})

export type UpdateLeadStageInput = z.infer<typeof UpdateLeadStageInputSchema>;

/**
 * Create lead note input schema
 */
export const CreateLeadNoteInputSchema = z.strictObject({
  lead_id: IdSchema.describe("The lead ID to add the note to"),
  content: z.string().min(1, { message: "Note content is required" }).describe("Note content (required)"),
})

export type CreateLeadNoteInput = z.infer<typeof CreateLeadNoteInputSchema>;

/**
 * Update lead task input schema
 */
export const UpdateLeadTaskInputSchema = z.strictObject({
  lead_id: IdSchema.describe("The lead ID"),
  task_id: IdSchema.describe("The task ID to update"),
  name: z.string().min(1).optional().describe("Task name"),
  description: z.string().optional().describe("Task description"),
  due_date: TimestampSchema.describe("Due date as Unix timestamp"),
  completed: z.boolean().optional().describe("Whether the task is completed"),
  assigned_to: z.string().optional().describe("User ID to assign the task to"),
})

export type UpdateLeadTaskInput = z.infer<typeof UpdateLeadTaskInputSchema>;

/**
 * Update lead note input schema
 */
export const UpdateLeadNoteInputSchema = z.strictObject({
  lead_id: IdSchema.describe("The lead ID"),
  note_id: IdSchema.describe("The note ID to update"),
  content: z.string().min(1, { message: "Note content is required" }).describe("Note content (required)"),
})

export type UpdateLeadNoteInput = z.infer<typeof UpdateLeadNoteInputSchema>;

/**
 * Delete lead task input schema
 */
export const DeleteLeadTaskInputSchema = z.strictObject({
  lead_id: IdSchema.describe("The lead ID"),
  task_id: IdSchema.describe("The task ID to delete"),
})

export type DeleteLeadTaskInput = z.infer<typeof DeleteLeadTaskInputSchema>;

/**
 * Update lead dates input schema
 */
export const UpdateLeadDatesInputSchema = z.strictObject({
  lead_id: IdSchema.describe("The lead ID"),
  creation_date: TimestampSchema.describe("Creation date as Unix timestamp"),
})

export type UpdateLeadDatesInput = z.infer<typeof UpdateLeadDatesInputSchema>;

/**
 * Create lead task input schema
 */
export const CreateLeadTaskInputSchema = z.strictObject({
  lead_id: IdSchema.describe("The lead ID to add the task to"),
  name: z.string().min(1, { message: "Task name is required" }).describe("Task name (required)"),
  description: z.string().optional().describe("Task description"),
  due_date: TimestampSchema.describe("Due date as Unix timestamp"),
  assigned_to: z.string().optional().describe("User ID to assign the task to"),
})

export type CreateLeadTaskInput = z.infer<typeof CreateLeadTaskInputSchema>;

/**
 * List lead notes input schema
 */
export const ListLeadNotesInputSchema = z.strictObject({
  lead_id: IdSchema.describe("The lead ID to list notes for"),
  response_format: ResponseFormatSchema,
})

export type ListLeadNotesInput = z.infer<typeof ListLeadNotesInputSchema>;

/**
 * List lead tasks input schema
 */
export const ListLeadTasksInputSchema = z.strictObject({
  lead_id: IdSchema.describe("The lead ID to list tasks for"),
  response_format: ResponseFormatSchema,
})

export type ListLeadTasksInput = z.infer<typeof ListLeadTasksInputSchema>;

/**
 * Delete lead note input schema
 */
export const DeleteLeadNoteInputSchema = z.strictObject({
  lead_id: IdSchema.describe("The lead ID"),
  note_id: IdSchema.describe("The note ID to delete"),
})

export type DeleteLeadNoteInput = z.infer<typeof DeleteLeadNoteInputSchema>;
