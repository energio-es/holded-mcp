/**
 * Lead tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, toStructuredContent } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import { Lead, LeadNote, LeadTask } from "../../types.js";
import {
  ListLeadsInputSchema,
  GetLeadInputSchema,
  CreateLeadInputSchema,
  UpdateLeadInputSchema,
  DeleteLeadInputSchema,
  UpdateLeadStageInputSchema,
  CreateLeadNoteInputSchema,
  UpdateLeadNoteInputSchema,
  UpdateLeadTaskInputSchema,
  DeleteLeadTaskInputSchema,
  UpdateLeadDatesInputSchema,
  CreateLeadTaskInputSchema,
  ListLeadNotesInputSchema,
  ListLeadTasksInputSchema,
  DeleteLeadNoteInputSchema,
  UpdateLeadStageInput,
  CreateLeadNoteInput,
  UpdateLeadNoteInput,
  UpdateLeadTaskInput,
  DeleteLeadTaskInput,
  UpdateLeadDatesInput,
  CreateLeadTaskInput,
  ListLeadNotesInput,
  ListLeadTasksInput,
  DeleteLeadNoteInput,
} from "../../schemas/crm/leads.js";
import { registerCrudTools } from "../factory.js";
import { snakeToCamel, withErrorHandling } from "../utilities.js";

/**
 * Format leads as markdown
 */
export function formatLeadsMarkdown(leads: Lead[]): string {
  if (!leads.length) {
    return "No leads found.";
  }

  const lines = ["# Leads", "", `Found ${leads.length} leads:`, ""];

  for (const lead of leads) {
    lines.push(`## ${lead.name}`);
    lines.push(`- **ID**: ${lead.id}`);
    if (lead.contactName) lines.push(`- **Contact**: ${lead.contactName}`);
    if (lead.potential !== undefined) lines.push(`- **Potential**: ${lead.potential} ${lead.currency || ""}`);
    if (lead.probability !== undefined) lines.push(`- **Probability**: ${lead.probability}%`);
    if (lead.status) lines.push(`- **Status**: ${lead.status}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single lead as markdown
 */
export function formatLeadMarkdown(lead: Lead): string {
  const lines = [`# ${lead.name}`, "", `**ID**: ${lead.id}`, ""];

  if (lead.contactName) lines.push(`- **Contact**: ${lead.contactName} (${lead.contactId || "N/A"})`);
  if (lead.funnelId) lines.push(`- **Funnel ID**: ${lead.funnelId}`);
  if (lead.stageId) lines.push(`- **Stage ID**: ${lead.stageId}`);
  if (lead.potential !== undefined) lines.push(`- **Potential**: ${lead.potential} ${lead.currency || ""}`);
  if (lead.probability !== undefined) lines.push(`- **Probability**: ${lead.probability}%`);
  if (lead.status) lines.push(`- **Status**: ${lead.status}`);
  if (lead.expectedCloseDate) lines.push(`- **Expected Close**: ${new Date(lead.expectedCloseDate * 1000).toLocaleDateString()}`);
  if (lead.assignedTo) lines.push(`- **Assigned To**: ${lead.assignedTo}`);

  if (lead.notes) {
    lines.push("", "## Notes", lead.notes);
  }

  if (lead.tags && lead.tags.length > 0) {
    lines.push("", `**Tags**: ${lead.tags.join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Register all lead-related tools
 */
export function registerLeadTools(server: McpServer): void {
  // ── Standard CRUD via factory ───────────────────────────
  registerCrudTools<Lead>(server, {
    module: "crm",
    toolPrefix: "holded_crm",
    resource: "lead",
    resourcePlural: "leads",
    endpoint: "leads",
    idParam: "lead_id",
    schemas: {
      list: ListLeadsInputSchema,
      get: GetLeadInputSchema,
      create: CreateLeadInputSchema,
      update: UpdateLeadInputSchema,
      delete: DeleteLeadInputSchema,
    },
    titles: {
      list: "List Holded Leads",
      get: "Get Holded Lead",
      create: "Create Holded Lead",
      update: "Update Holded Lead",
      delete: "Delete Holded Lead",
    },
    descriptions: {
      list: `List all leads from Holded CRM.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - funnel_id (string): Filter by funnel ID (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of leads with id, name, contact, potential, probability, and status.`,
      get: `Get a specific lead by ID from Holded CRM.

Args:
  - lead_id (string): The lead ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Lead details including contact, potential, stage, and custom fields.`,
      create: `Create a new lead in Holded CRM.

Args:
  - name (string): Lead name (required)
  - funnel_id (string): Funnel ID (required)
  - contact_id (string): Contact ID (required)
  - stage_id (string): Stage ID within the funnel
  - contact_name (string): Contact name
  - value (number): Monetary value of the lead
  - due_date (number): Due date as Unix timestamp

Returns:
  The created lead with its assigned ID.`,
      update: `Update an existing lead in Holded CRM.

Args:
  - lead_id (string): The lead ID to update (required)
  - name (string): Lead name
  - value (number): Monetary value
  - due_date (number): Due date as Unix timestamp
  - status (number): Lead status indicator
  - customFields (array): Custom field key-value pairs

Returns:
  The updated lead.`,
      delete: `Delete a lead from Holded CRM.

Args:
  - lead_id (string): The lead ID to delete (required)

Returns:
  Confirmation of deletion.`,
    },
    formatters: {
      list: formatLeadsMarkdown,
      single: formatLeadMarkdown,
    },
    listQueryParams: (params) => {
      const qp: Record<string, unknown> = {};
      if (params.funnel_id) qp.funnelId = params.funnel_id;
      return qp;
    },
    bodyTransform: snakeToCamel,
  });

  // ── Manual tools (sub-resource endpoints) ───────────────

  // Update Lead Stage
  server.registerTool(
    "holded_crm_update_lead_stage",
    {
      title: "Update Holded Lead Stage",
      description: `Move a lead to a different stage in the sales funnel.

Args:
  - lead_id (string): The lead ID to move (required)
  - stage_id (string): The target stage ID (required)

Returns:
  Confirmation of stage update.`,
      inputSchema: UpdateLeadStageInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const typedParams = params as unknown as UpdateLeadStageInput;
      const result = await makeApiRequest<{ status: string }>(
        "crm",
        `leads/${typedParams.lead_id}/stages`,
        "PUT",
        { stageId: typedParams.stage_id }
      );

      return {
        content: [
          {
            type: "text",
            text: `Lead stage updated successfully.\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
        structuredContent: { updated: true, leadId: typedParams.lead_id, stageId: typedParams.stage_id },
      };
    })
  );

  // Create Lead Note
  server.registerTool(
    "holded_crm_create_lead_note",
    {
      title: "Create Holded Lead Note",
      description: `Add a note to a lead in Holded CRM.

Args:
  - lead_id (string): The lead ID to add the note to (required)
  - content (string): Note content (required)

Returns:
  The created note.`,
      inputSchema: CreateLeadNoteInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const typedParams = params as unknown as CreateLeadNoteInput;
      const note = await makeApiRequest<LeadNote>(
        "crm",
        `leads/${typedParams.lead_id}/notes`,
        "POST",
        { content: typedParams.content }
      );

      return {
        content: [
          {
            type: "text",
            text: `Note added successfully.\n\n${JSON.stringify(note, null, 2)}`,
          },
        ],
        structuredContent: toStructuredContent(note),
      };
    })
  );

  // Update Lead Task
  server.registerTool(
    "holded_crm_update_lead_task",
    {
      title: "Update Holded Lead Task",
      description: `Update a task associated with a lead in Holded CRM.

Args:
  - lead_id (string): The lead ID (required)
  - task_id (string): The task ID to update (required)
  - name (string): Task name
  - description (string): Task description
  - due_date (number): Due date as Unix timestamp
  - completed (boolean): Whether the task is completed
  - assigned_to (string): User ID to assign the task to

Returns:
  The updated task.`,
      inputSchema: UpdateLeadTaskInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { lead_id, task_id, due_date, assigned_to, ...rest } = params as unknown as UpdateLeadTaskInput;
      const requestData: Record<string, unknown> = { ...rest };
      if (due_date) requestData.dueDate = due_date;
      if (assigned_to) requestData.assignedTo = assigned_to;

      const task = await makeApiRequest<{ id: string; name: string }>(
        "crm",
        `leads/${lead_id}/tasks`,
        "PUT",
        { taskId: task_id, ...requestData }
      );

      return {
        content: [
          {
            type: "text",
            text: `Task updated successfully.\n\n${JSON.stringify(task, null, 2)}`,
          },
        ],
        structuredContent: toStructuredContent(task),
      };
    })
  );

  // Update Lead Note
  server.registerTool(
    "holded_crm_update_lead_note",
    {
      title: "Update Holded Lead Note",
      description: `Update a note associated with a lead in Holded CRM.

Args:
  - lead_id (string): The lead ID (required)
  - note_id (string): The note ID to update (required)
  - content (string): Note content (required)

Returns:
  The updated note.`,
      inputSchema: UpdateLeadNoteInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { lead_id, note_id, content } = params as unknown as UpdateLeadNoteInput;
      const note = await makeApiRequest<LeadNote>(
        "crm",
        `leads/${lead_id}/notes`,
        "PUT",
        { noteId: note_id, content }
      );

      return {
        content: [
          {
            type: "text",
            text: `Note updated successfully.\n\n${JSON.stringify(note, null, 2)}`,
          },
        ],
        structuredContent: toStructuredContent(note),
      };
    })
  );

  // Delete Lead Task
  server.registerTool(
    "holded_crm_delete_lead_task",
    {
      title: "Delete Holded Lead Task",
      description: `Delete a task associated with a lead in Holded CRM.

Args:
  - lead_id (string): The lead ID (required)
  - task_id (string): The task ID to delete (required)

Returns:
  Confirmation of task deletion.`,
      inputSchema: DeleteLeadTaskInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { lead_id, task_id } = params as unknown as DeleteLeadTaskInput;
      await makeApiRequest<void>(
        "crm",
        `leads/${lead_id}/tasks`,
        "DELETE",
        { taskId: task_id }
      );

      return {
        content: [
          {
            type: "text",
            text: `Task ${task_id} deleted successfully from lead ${lead_id}.`,
          },
        ],
        structuredContent: { deleted: true, leadId: lead_id, taskId: task_id },
      };
    })
  );

  // Update Lead Dates
  server.registerTool(
    "holded_crm_update_lead_dates",
    {
      title: "Update Holded Lead Dates",
      description: `Update the creation date of a lead in Holded CRM.

Args:
  - lead_id (string): The lead ID (required)
  - creation_date (number): Creation date as Unix timestamp (required)

Returns:
  Confirmation of date update.`,
      inputSchema: UpdateLeadDatesInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { lead_id, creation_date } = params as unknown as UpdateLeadDatesInput;
      const result = await makeApiRequest<{ status: string; [key: string]: unknown }>(
        "crm",
        `leads/${lead_id}/dates`,
        "PUT",
        { creationDate: creation_date }
      );

      return {
        content: [
          {
            type: "text",
            text: `Lead dates updated successfully.\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
        structuredContent: { updated: true, leadId: lead_id, creationDate: creation_date, ...result },
      };
    })
  );

  // Create Lead Task
  server.registerTool(
    "holded_crm_create_lead_task",
    {
      title: "Create Holded Lead Task",
      description: `Create a new task for a lead in Holded CRM.

Args:
  - lead_id (string): The lead ID to add the task to (required)
  - name (string): Task name (required)
  - description (string): Task description
  - due_date (number): Due date as Unix timestamp
  - assigned_to (string): User ID to assign the task to

Returns:
  The created task.`,
      inputSchema: CreateLeadTaskInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { lead_id, due_date, assigned_to, ...rest } = params as unknown as CreateLeadTaskInput;
      const requestData: Record<string, unknown> = { ...rest };
      if (due_date) requestData.dueDate = due_date;
      if (assigned_to) requestData.assignedTo = assigned_to;

      const task = await makeApiRequest<LeadTask>(
        "crm",
        `leads/${lead_id}/tasks`,
        "POST",
        requestData
      );

      return {
        content: [
          {
            type: "text",
            text: `Task created successfully.\n\n${JSON.stringify(task, null, 2)}`,
          },
        ],
        structuredContent: toStructuredContent(task),
      };
    })
  );

  // List Lead Notes
  server.registerTool(
    "holded_crm_list_lead_notes",
    {
      title: "List Holded Lead Notes",
      description: `List all notes for a lead in Holded CRM.

Args:
  - lead_id (string): The lead ID to list notes for (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of notes with id, content, and creation date.`,
      inputSchema: ListLeadNotesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const typedParams = params as unknown as ListLeadNotesInput;
      const notes = await makeApiRequest<LeadNote[]>(
        "crm",
        `leads/${typedParams.lead_id}/notes`,
        "GET"
      );

      let textContent: string;
      if (typedParams.response_format === ResponseFormat.MARKDOWN) {
        if (!notes.length) {
          textContent = `No notes found for lead ${typedParams.lead_id}.`;
        } else {
          const lines = ["# Lead Notes", "", `Found ${notes.length} notes:`, ""];
          for (const note of notes) {
            lines.push(`## Note ${note.id}`);
            lines.push(`- **Content**: ${note.content}`);
            if (note.createdAt) lines.push(`- **Created**: ${new Date(note.createdAt * 1000).toLocaleDateString()}`);
            if (note.createdBy) lines.push(`- **Created By**: ${note.createdBy}`);
            lines.push("");
          }
          textContent = lines.join("\n");
        }
      } else {
        textContent = JSON.stringify(notes, null, 2);
      }

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: { notes, count: notes.length, leadId: typedParams.lead_id },
      };
    })
  );

  // List Lead Tasks
  server.registerTool(
    "holded_crm_list_lead_tasks",
    {
      title: "List Holded Lead Tasks",
      description: `List all tasks for a lead in Holded CRM.

Args:
  - lead_id (string): The lead ID to list tasks for (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of tasks with id, name, description, due date, and status.`,
      inputSchema: ListLeadTasksInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const typedParams = params as unknown as ListLeadTasksInput;
      const tasks = await makeApiRequest<LeadTask[]>(
        "crm",
        `leads/${typedParams.lead_id}/tasks`,
        "GET"
      );

      let textContent: string;
      if (typedParams.response_format === ResponseFormat.MARKDOWN) {
        if (!tasks.length) {
          textContent = `No tasks found for lead ${typedParams.lead_id}.`;
        } else {
          const lines = ["# Lead Tasks", "", `Found ${tasks.length} tasks:`, ""];
          for (const task of tasks) {
            lines.push(`## ${task.name}`);
            lines.push(`- **ID**: ${task.id}`);
            if (task.description) lines.push(`- **Description**: ${task.description}`);
            if (task.dueDate) lines.push(`- **Due Date**: ${new Date(task.dueDate * 1000).toLocaleDateString()}`);
            if (task.completed !== undefined) lines.push(`- **Completed**: ${task.completed ? "Yes" : "No"}`);
            if (task.assignedTo) lines.push(`- **Assigned To**: ${task.assignedTo}`);
            lines.push("");
          }
          textContent = lines.join("\n");
        }
      } else {
        textContent = JSON.stringify(tasks, null, 2);
      }

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: { tasks, count: tasks.length, leadId: typedParams.lead_id },
      };
    })
  );

  // Delete Lead Note
  server.registerTool(
    "holded_crm_delete_lead_note",
    {
      title: "Delete Holded Lead Note",
      description: `Delete a note from a lead in Holded CRM.

Args:
  - lead_id (string): The lead ID (required)
  - note_id (string): The note ID to delete (required)

Returns:
  Confirmation of note deletion.`,
      inputSchema: DeleteLeadNoteInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { lead_id, note_id } = params as unknown as DeleteLeadNoteInput;
      await makeApiRequest<void>(
        "crm",
        `leads/${lead_id}/notes`,
        "DELETE",
        { noteId: note_id }
      );

      return {
        content: [
          {
            type: "text",
            text: `Note ${note_id} deleted successfully from lead ${lead_id}.`,
          },
        ],
        structuredContent: { deleted: true, leadId: lead_id, noteId: note_id },
      };
    })
  );
}
