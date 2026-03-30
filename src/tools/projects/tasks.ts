/**
 * Task tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError, toStructuredContent } from "../../services/api.js";
import { Task } from "../../types.js";
import {
  ListTasksInputSchema,
  CreateTaskInputSchema,
  GetTaskInputSchema,
  UpdateTaskInputSchema,
  DeleteTaskInputSchema,
  CreateTaskInput,
} from "../../schemas/projects/tasks.js";
import { registerCrudTools } from "../factory.js";

/**
 * Format tasks as markdown
 */
function formatTasksMarkdown(tasks: Task[]): string {
  if (!tasks.length) {
    return "No tasks found.";
  }

  const lines = ["# Tasks", "", `Found ${tasks.length} tasks:`, ""];

  for (const task of tasks) {
    lines.push(`## ${task.name}`);
    lines.push(`- **ID**: ${task.id}`);
    if (task.projectId) lines.push(`- **Project ID**: ${task.projectId}`);
    if (task.status) lines.push(`- **Status**: ${task.status}`);
    if (task.priority) lines.push(`- **Priority**: ${task.priority}`);
    if (task.dueDate) lines.push(`- **Due Date**: ${new Date(task.dueDate * 1000).toLocaleDateString()}`);
    if (task.completed !== undefined) lines.push(`- **Completed**: ${task.completed ? "Yes" : "No"}`);
    if (task.assignedTo) lines.push(`- **Assigned To**: ${task.assignedTo}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single task as markdown
 */
function formatTaskMarkdown(task: Task): string {
  return formatTasksMarkdown([task]);
}

/**
 * Register all task-related tools
 */
export function registerTaskTools(server: McpServer): void {
  // ── Standard CRUD via factory (list, get, update, delete) ─
  registerCrudTools<Task>(server, {
    module: "projects",
    toolPrefix: "holded_projects",
    resource: "task",
    resourcePlural: "tasks",
    endpoint: "tasks",
    idParam: "task_id",
    schemas: {
      list: ListTasksInputSchema,
      get: GetTaskInputSchema,
      update: UpdateTaskInputSchema,
      delete: DeleteTaskInputSchema,
    },
    titles: {
      list: "List Holded Tasks",
      get: "Get Holded Task",
      update: "Update Holded Task",
      delete: "Delete Holded Task",
    },
    descriptions: {
      list: `List all tasks from Holded Projects.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - project_id (string): Filter by project ID (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of tasks with id, name, status, priority, due date, and assignee.`,
      get: `Get a specific task by ID from Holded Projects.

Args:
  - task_id (string): The task ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Task details including name, status, priority, due date, and assignee.`,
      update: `Update an existing task in Holded Projects.

Note: The Holded API documentation does not explicitly document task updates.
This tool supports updating the task name. Additional fields may be supported
but are not officially documented.

Args:
  - task_id (string): The task ID to update (required)
  - name (string): Task name (optional)

Returns:
  The updated task.`,
      delete: `Delete a task from Holded Projects.

Args:
  - task_id (string): The task ID to delete (required)

Returns:
  Confirmation of deletion.`,
    },
    formatters: {
      list: formatTasksMarkdown,
      single: formatTaskMarkdown,
    },
    listQueryParams: (params) => {
      const qp: Record<string, unknown> = {};
      if (params.project_id) qp.projectId = params.project_id;
      return qp;
    },
  });

  // ── Manual tool (needs snake_to_camel conversion) ───────

  // Create Task
  server.registerTool(
    "holded_projects_create_task",
    {
      title: "Create Holded Task",
      description: `Create a new task in Holded Projects.

According to Holded Projects API v1.2, task creation requires:
  - name (string): Task name (required)
  - project_id (string): Project ID to associate the task with (required)
  - list_id (string): Task list/column ID within the project (required). Get available listIds from the project details.

Returns:
  The created task with its assigned ID.`,
      inputSchema: CreateTaskInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateTaskInput) => {
      try {
        const { project_id, list_id, name } = params;
        // Transform snake_case to camelCase for API
        const requestData = {
          name,
          projectId: project_id,
          listId: list_id,
        };

        const task = await makeApiRequest<Task>(
          "projects",
          "tasks",
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
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );
}
