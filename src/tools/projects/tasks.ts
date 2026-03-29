/**
 * Task tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError, toStructuredContent } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import { Task } from "../../types.js";
import {
  ListTasksInputSchema,
  CreateTaskInputSchema,
  GetTaskInputSchema,
  UpdateTaskInputSchema,
  DeleteTaskInputSchema,
  ListTasksInput,
  CreateTaskInput,
  GetTaskInput,
  UpdateTaskInput,
  DeleteTaskInput,
} from "../../schemas/projects/tasks.js";

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
 * Register all task-related tools
 */
export function registerTaskTools(server: McpServer): void {
  // List Tasks
  server.registerTool(
    "holded_projects_list_tasks",
    {
      title: "List Holded Tasks",
      description: `List all tasks from Holded Projects.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - project_id (string): Filter by project ID (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of tasks with id, name, status, priority, due date, and assignee.`,
      inputSchema: ListTasksInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListTasksInput) => {
      try {
        const queryParams: Record<string, unknown> = {};
        if (params.page > 1) {
          queryParams.page = params.page;
        }
        if (params.project_id) {
          queryParams.projectId = params.project_id;
        }

        const tasks = await makeApiRequest<Task[]>(
          "projects",
          "tasks",
          "GET",
          undefined,
          queryParams
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatTasksMarkdown(tasks)
            : JSON.stringify(tasks, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { tasks, count: tasks.length, page: params.page },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

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

  // Get Task
  server.registerTool(
    "holded_projects_get_task",
    {
      title: "Get Holded Task",
      description: `Get a specific task by ID from Holded Projects.

Args:
  - task_id (string): The task ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Task details including name, status, priority, due date, and assignee.`,
      inputSchema: GetTaskInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetTaskInput) => {
      try {
        const task = await makeApiRequest<Task>(
          "projects",
          `tasks/${params.task_id}`,
          "GET"
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatTasksMarkdown([task])
            : JSON.stringify(task, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
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

  // Update Task
  server.registerTool(
    "holded_projects_update_task",
    {
      title: "Update Holded Task",
      description: `Update an existing task in Holded Projects.

Note: The Holded API documentation does not explicitly document task updates.
This tool supports updating the task name. Additional fields may be supported
but are not officially documented.

Args:
  - task_id (string): The task ID to update (required)
  - name (string): Task name (optional)

Returns:
  The updated task.`,
      inputSchema: UpdateTaskInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: UpdateTaskInput) => {
      try {
        const { task_id, name } = params;
        const requestData: Record<string, unknown> = {};
        if (name) requestData.name = name;

        const task = await makeApiRequest<Task>(
          "projects",
          `tasks/${task_id}`,
          "PUT",
          requestData
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
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Delete Task
  server.registerTool(
    "holded_projects_delete_task",
    {
      title: "Delete Holded Task",
      description: `Delete a task from Holded Projects.

Args:
  - task_id (string): The task ID to delete (required)

Returns:
  Confirmation of deletion.`,
      inputSchema: DeleteTaskInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: DeleteTaskInput) => {
      try {
        await makeApiRequest<void>(
          "projects",
          `tasks/${params.task_id}`,
          "DELETE"
        );

        return {
          content: [
            {
              type: "text",
              text: `Task ${params.task_id} deleted successfully.`,
            },
          ],
          structuredContent: { deleted: true, id: params.task_id },
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
