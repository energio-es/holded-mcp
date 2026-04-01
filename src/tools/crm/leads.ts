/**
 * Lead tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, toStructuredContent } from "../../services/api.js";
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
  UpdateLeadStageInput,
  CreateLeadNoteInput,
  UpdateLeadNoteInput,
  UpdateLeadTaskInput,
  DeleteLeadTaskInput,
  UpdateLeadDatesInput,
  CreateLeadTaskInput,
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
    if (lead.potential !== undefined) lines.push(`- **Potential**: ${lead.potential}`);
    if (lead.status !== undefined) lines.push(`- **Status**: ${lead.status}`);
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
  if (lead.potential !== undefined) lines.push(`- **Potential**: ${lead.potential}`);
  if (lead.value !== undefined) lines.push(`- **Value**: ${lead.value}`);
  if (lead.status !== undefined) lines.push(`- **Status**: ${lead.status}`);
  if (lead.userId) lines.push(`- **User ID**: ${lead.userId}`);
  if (lead.dueDate) lines.push(`- **Due Date**: ${new Date(lead.dueDate * 1000).toLocaleDateString()}`);
  if (lead.createdAt) lines.push(`- **Created At**: ${new Date(lead.createdAt * 1000).toLocaleString()}`);

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
  - title (string): Note title (required)
  - desc (string): Note description/body

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
      const body: Record<string, unknown> = { title: typedParams.title };
      if (typedParams.desc !== undefined) body.desc = typedParams.desc;
      const note = await makeApiRequest<LeadNote>(
        "crm",
        `leads/${typedParams.lead_id}/notes`,
        "POST",
        body
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
  - title (string): Note title (required)
  - desc (string): Note description/body

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
      const { lead_id, note_id, title, desc } = params as unknown as UpdateLeadNoteInput;
      const body: Record<string, unknown> = { noteId: note_id, title };
      if (desc !== undefined) body.desc = desc;
      const note = await makeApiRequest<LeadNote>(
        "crm",
        `leads/${lead_id}/notes`,
        "PUT",
        body
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
  - date (number): Lead creation date as Unix timestamp (required)

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
      const { lead_id, date } = params as unknown as UpdateLeadDatesInput;
      const result = await makeApiRequest<{ status: string; [key: string]: unknown }>(
        "crm",
        `leads/${lead_id}/dates`,
        "PUT",
        { date }
      );

      return {
        content: [
          {
            type: "text",
            text: `Lead dates updated successfully.\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
        structuredContent: { updated: true, leadId: lead_id, date, ...result },
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

}
