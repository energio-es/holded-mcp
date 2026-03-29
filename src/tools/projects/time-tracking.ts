/**
 * Project Time Tracking tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError, toStructuredContent } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import { TimeTracking } from "../../types.js";
import {
  ListProjectTimeTrackingsInputSchema,
  CreateProjectTimeTrackingInputSchema,
  UpdateProjectTimeTrackingInputSchema,
  DeleteProjectTimeTrackingInputSchema,
  GetProjectTimeTrackingInputSchema,
  ListAllProjectTimesInputSchema,
  ListProjectTimeTrackingsInput,
  CreateProjectTimeTrackingInput,
  UpdateProjectTimeTrackingInput,
  DeleteProjectTimeTrackingInput,
  GetProjectTimeTrackingInput,
  ListAllProjectTimesInput,
} from "../../schemas/projects/time-tracking.js";

/**
 * Format project time-trackings as markdown
 */
function formatProjectTimeTrackingsMarkdown(times: TimeTracking[]): string {
  if (!times.length) {
    return "No time-trackings found for this project.";
  }

  const lines = ["# Project Time Trackings", "", `Found ${times.length} time entries:`, ""];

  for (const time of times) {
    lines.push(`## Entry ${time.id}`);
    lines.push(`- **ID**: ${time.id}`);
    lines.push(`- **Date**: ${new Date(time.date * 1000).toLocaleDateString()}`);
    lines.push(`- **Hours**: ${time.hours}`);
    if (time.employeeName) lines.push(`- **Employee**: ${time.employeeName}`);
    if (time.description) lines.push(`- **Description**: ${time.description}`);
    if (time.taskName) lines.push(`- **Task**: ${time.taskName}`);
    if (time.billable !== undefined) lines.push(`- **Billable**: ${time.billable ? "Yes" : "No"}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Register all project time-tracking-related tools
 */
export function registerProjectTimeTrackingTools(server: McpServer): void {
  // List Project Time Trackings
  server.registerTool(
    "holded_projects_list_project_time_trackings",
    {
      title: "List Holded Project Time Trackings",
      description: `List all time-trackings for a specific project from Holded.

Args:
  - project_id (string): The project ID (required)
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of time-trackings for the project.`,
      inputSchema: ListProjectTimeTrackingsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListProjectTimeTrackingsInput) => {
      try {
        const queryParams: Record<string, unknown> = {};
        if (params.page > 1) {
          queryParams.page = params.page;
        }

        const times = await makeApiRequest<TimeTracking[]>(
          "projects",
          `projects/${params.project_id}/times`,
          "GET",
          undefined,
          queryParams
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatProjectTimeTrackingsMarkdown(times)
            : JSON.stringify(times, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { timeTrackings: times, count: times.length, page: params.page },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Create Project Time Tracking
  server.registerTool(
    "holded_projects_create_project_time_tracking",
    {
      title: "Create Holded Project Time Tracking",
      description: `Create a new time-tracking entry for a project in Holded.

Args:
  - project_id (string): The project ID (required)
  - duration (number): Duration in seconds (required)
  - costHour (number): Cost per hour (required)
  - desc (string): Description of work (optional)
  - userId (string): User/Employee ID (optional)
  - taskId (string): Task ID (optional)

Returns:
  The created time-tracking with its assigned ID.`,
      inputSchema: CreateProjectTimeTrackingInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateProjectTimeTrackingInput) => {
      try {
        const { project_id, ...timeData } = params;
        const time = await makeApiRequest<TimeTracking>(
          "projects",
          `projects/${project_id}/times`,
          "POST",
          timeData
        );

        return {
          content: [
            {
              type: "text",
              text: `Project time-tracking created successfully.\n\n${JSON.stringify(time, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(time),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Update Project Time Tracking
  server.registerTool(
    "holded_projects_update_project_time_tracking",
    {
      title: "Update Holded Project Time Tracking",
      description: `Update an existing time-tracking entry for a project in Holded.

Args:
  - project_id (string): The project ID (required)
  - time_id (string): The time-tracking ID to update (required)
  - duration (number): Duration in seconds (optional)
  - costHour (number): Cost per hour (optional)
  - desc (string): Description of work (optional)
  - userId (string): User/Employee ID (optional)
  - taskId (string): Task ID (optional)

Returns:
  The updated time-tracking.`,
      inputSchema: UpdateProjectTimeTrackingInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: UpdateProjectTimeTrackingInput) => {
      try {
        const { project_id, time_id, ...updateData } = params;
        const time = await makeApiRequest<TimeTracking>(
          "projects",
          `projects/${project_id}/times/${time_id}`,
          "PUT",
          updateData
        );

        return {
          content: [
            {
              type: "text",
              text: `Project time-tracking updated successfully.\n\n${JSON.stringify(time, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(time),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Delete Project Time Tracking
  server.registerTool(
    "holded_projects_delete_project_time_tracking",
    {
      title: "Delete Holded Project Time Tracking",
      description: `Delete a time-tracking entry from a project in Holded.

Args:
  - project_id (string): The project ID (required)
  - time_id (string): The time-tracking ID to delete (required)

Returns:
  Confirmation of deletion.`,
      inputSchema: DeleteProjectTimeTrackingInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: DeleteProjectTimeTrackingInput) => {
      try {
        await makeApiRequest<void>(
          "projects",
          `projects/${params.project_id}/times/${params.time_id}`,
          "DELETE"
        );

        return {
          content: [
            {
              type: "text",
              text: `Project time-tracking ${params.time_id} deleted successfully.`,
            },
          ],
          structuredContent: { deleted: true, id: params.time_id, projectId: params.project_id },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Get Project Time Tracking
  server.registerTool(
    "holded_projects_get_project_time_tracking",
    {
      title: "Get Holded Project Time Tracking",
      description: `Get a specific time-tracking entry for a project from Holded.

Args:
  - project_id (string): The project ID (required)
  - time_id (string): The time-tracking ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Time-tracking details including duration, description, cost, and other fields.`,
      inputSchema: GetProjectTimeTrackingInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetProjectTimeTrackingInput) => {
      try {
        const time = await makeApiRequest<TimeTracking>(
          "projects",
          `projects/${params.project_id}/times/${params.time_id}`,
          "GET"
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines = [`# Time Tracking Entry ${time.id}`, ""];
          if (time.date) lines.push(`- **Date**: ${new Date(time.date * 1000).toLocaleDateString()}`);
          if (time.hours !== undefined) lines.push(`- **Hours**: ${time.hours}`);
          if (time.duration !== undefined) lines.push(`- **Duration**: ${time.duration} seconds`);
          if (time.description) lines.push(`- **Description**: ${time.description}`);
          if (time.employeeName) lines.push(`- **Employee**: ${time.employeeName}`);
          if (time.taskName) lines.push(`- **Task**: ${time.taskName}`);
          if (time.costHour !== undefined) lines.push(`- **Cost/Hour**: ${time.costHour}`);
          if (time.total !== undefined) lines.push(`- **Total**: ${time.total}`);
          if (time.billable !== undefined) lines.push(`- **Billable**: ${time.billable ? "Yes" : "No"}`);
          textContent = lines.join("\n");
        } else {
          textContent = JSON.stringify(time, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: toStructuredContent(time),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // List All Project Times
  server.registerTool(
    "holded_projects_list_all_times",
    {
      title: "List All Holded Project Times",
      description: `List time trackings in projects not archived from 18 months on.

Args:
  - start (number): Start date as Unix timestamp (optional)
  - end (number): End date as Unix timestamp (optional)
  - archived (boolean): Include archived projects (optional)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of projects with their time-tracking entries.`,
      inputSchema: ListAllProjectTimesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListAllProjectTimesInput) => {
      try {
        const queryParams: Record<string, unknown> = {};
        if (params.start !== undefined) {
          queryParams.start = params.start;
        }
        if (params.end !== undefined) {
          queryParams.end = params.end;
        }
        if (params.archived !== undefined) {
          queryParams.archived = params.archived;
        }

        const projects = await makeApiRequest<Array<{
          id: string;
          name: string;
          timeTracking: Array<{
            timeId: string;
            duration: number;
            desc: string;
            costHour: number;
            userId: string;
            taskId: string;
            total: number;
          }>;
        }>>(
          "projects",
          "projects/times",
          "GET",
          undefined,
          queryParams
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          if (!projects.length) {
            textContent = "No project times found.";
          } else {
            const lines = ["# All Project Times", "", `Found ${projects.length} projects:`, ""];
            for (const project of projects) {
              lines.push(`## ${project.name} (${project.id})`);
              if (project.timeTracking && project.timeTracking.length > 0) {
                lines.push(`**Time Entries**: ${project.timeTracking.length}`);
                for (const time of project.timeTracking) {
                  lines.push(`- ${time.desc || "Time entry"} (${time.duration}s, ${time.total || 0} total)`);
                }
              } else {
                lines.push("No time entries");
              }
              lines.push("");
            }
            textContent = lines.join("\n");
          }
        } else {
          textContent = JSON.stringify(projects, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { projects, count: projects.length },
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
