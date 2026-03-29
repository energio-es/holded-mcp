/**
 * Time Tracking tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError, toStructuredContent } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import { TimeTracking } from "../../types.js";
import {
  ListAllTimeTrackingsInputSchema,
  ListEmployeeTimeTrackingsInputSchema,
  GetTimeTrackingInputSchema,
  CreateEmployeeTimeTrackingInputSchema,
  UpdateTimeTrackingInputSchema,
  DeleteTimeTrackingInputSchema,
  EmployeeClockInInputSchema,
  EmployeeClockOutInputSchema,
  EmployeePauseInputSchema,
  EmployeeUnpauseInputSchema,
  ListAllTimeTrackingsInput,
  ListEmployeeTimeTrackingsInput,
  GetTimeTrackingInput,
  CreateEmployeeTimeTrackingInput,
  UpdateTimeTrackingInput,
  DeleteTimeTrackingInput,
  EmployeeClockInInput,
  EmployeeClockOutInput,
  EmployeePauseInput,
  EmployeeUnpauseInput,
} from "../../schemas/team/time-tracking.js";

/**
 * Format time-trackings as markdown
 */
function formatTimeTrackingsMarkdown(times: TimeTracking[]): string {
  if (!times.length) {
    return "No time-trackings found.";
  }

  const lines = ["# Time Trackings", "", `Found ${times.length} time entries:`, ""];

  for (const time of times) {
    lines.push(`## ${time.employeeName || `Employee ${time.employeeId}`}`);
    lines.push(`- **ID**: ${time.id}`);
    lines.push(`- **Date**: ${new Date(time.date * 1000).toLocaleDateString()}`);
    lines.push(`- **Hours**: ${time.hours}`);
    if (time.description) lines.push(`- **Description**: ${time.description}`);
    if (time.projectName) lines.push(`- **Project**: ${time.projectName}`);
    if (time.taskName) lines.push(`- **Task**: ${time.taskName}`);
    if (time.billable !== undefined) lines.push(`- **Billable**: ${time.billable ? "Yes" : "No"}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single time-tracking as markdown
 */
function formatTimeTrackingMarkdown(time: TimeTracking): string {
  const lines = [`# Time Tracking Entry`, "", `**ID**: ${time.id}`, ""];
  lines.push(`- **Employee**: ${time.employeeName || time.employeeId}`);
  lines.push(`- **Date**: ${new Date(time.date * 1000).toLocaleDateString()}`);
  lines.push(`- **Hours**: ${time.hours}`);
  if (time.description) lines.push(`- **Description**: ${time.description}`);
  if (time.projectName) lines.push(`- **Project**: ${time.projectName} (${time.projectId})`);
  if (time.taskName) lines.push(`- **Task**: ${time.taskName} (${time.taskId})`);
  if (time.billable !== undefined) lines.push(`- **Billable**: ${time.billable ? "Yes" : "No"}`);

  return lines.join("\n");
}

/**
 * Register all time-tracking-related tools
 */
export function registerTimeTrackingTools(server: McpServer): void {
  // List All Time Trackings
  server.registerTool(
    "holded_team_list_all_time_trackings",
    {
      title: "List All Holded Time Trackings",
      description: `List all time-trackings for all employees from Holded.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of time-trackings with id, employee, date, hours, and description.`,
      inputSchema: ListAllTimeTrackingsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListAllTimeTrackingsInput) => {
      try {
        const queryParams: Record<string, unknown> = {};
        if (params.page > 1) {
          queryParams.page = params.page;
        }

        const times = await makeApiRequest<TimeTracking[]>(
          "team",
          "employees/times",
          "GET",
          undefined,
          queryParams
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatTimeTrackingsMarkdown(times)
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

  // List Employee Time Trackings
  server.registerTool(
    "holded_team_list_employee_time_trackings",
    {
      title: "List Holded Employee Time Trackings",
      description: `List all time-trackings for a specific employee from Holded.

Args:
  - employee_id (string): The employee ID (required)
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of time-trackings for the employee.`,
      inputSchema: ListEmployeeTimeTrackingsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListEmployeeTimeTrackingsInput) => {
      try {
        const queryParams: Record<string, unknown> = {};
        if (params.page > 1) {
          queryParams.page = params.page;
        }

        const times = await makeApiRequest<TimeTracking[]>(
          "team",
          `employees/${params.employee_id}/times`,
          "GET",
          undefined,
          queryParams
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatTimeTrackingsMarkdown(times)
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

  // Get Time Tracking
  server.registerTool(
    "holded_team_get_time_tracking",
    {
      title: "Get Holded Time Tracking",
      description: `Get a specific time-tracking by ID from Holded.

Args:
  - time_id (string): The time-tracking ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Time-tracking details including employee, date, hours, and description.`,
      inputSchema: GetTimeTrackingInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetTimeTrackingInput) => {
      try {
        const time = await makeApiRequest<TimeTracking>(
          "team",
          `employees/times/${params.time_id}`,
          "GET"
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatTimeTrackingMarkdown(time)
            : JSON.stringify(time, null, 2);

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

  // Create Employee Time Tracking
  server.registerTool(
    "holded_team_create_employee_time_tracking",
    {
      title: "Create Holded Employee Time Tracking",
      description: `Create a new time-tracking entry for an employee in Holded.

Args:
  - employee_id (string): The employee ID (required)
  - startTmp (string): Start time as Unix timestamp string (required)
  - endTmp (string): End time as Unix timestamp string (required)

Returns:
  The created time-tracking with its assigned ID.`,
      inputSchema: CreateEmployeeTimeTrackingInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateEmployeeTimeTrackingInput) => {
      try {
        const { employee_id, startTmp, endTmp } = params;
        const time = await makeApiRequest<TimeTracking>(
          "team",
          `employees/${employee_id}/times`,
          "POST",
          { startTmp, endTmp }
        );

        return {
          content: [
            {
              type: "text",
              text: `Time-tracking created successfully.\n\n${JSON.stringify(time, null, 2)}`,
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

  // Update Time Tracking
  server.registerTool(
    "holded_team_update_time_tracking",
    {
      title: "Update Holded Time Tracking",
      description: `Update an existing time-tracking in Holded.

Args:
  - time_id (string): The time-tracking ID to update (required)
  - startTmp (string): Start time as Unix timestamp string (required)
  - endTmp (string): End time as Unix timestamp string (required)

Returns:
  The updated time-tracking.`,
      inputSchema: UpdateTimeTrackingInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: UpdateTimeTrackingInput) => {
      try {
        const { time_id, startTmp, endTmp } = params;
        const time = await makeApiRequest<TimeTracking>(
          "team",
          `employees/times/${time_id}`,
          "PUT",
          { startTmp, endTmp }
        );

        return {
          content: [
            {
              type: "text",
              text: `Time-tracking updated successfully.\n\n${JSON.stringify(time, null, 2)}`,
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

  // Delete Time Tracking
  server.registerTool(
    "holded_team_delete_time_tracking",
    {
      title: "Delete Holded Time Tracking",
      description: `Delete a time-tracking from Holded.

Args:
  - time_id (string): The time-tracking ID to delete (required)

Returns:
  Confirmation of deletion.`,
      inputSchema: DeleteTimeTrackingInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: DeleteTimeTrackingInput) => {
      try {
        await makeApiRequest<void>(
          "team",
          `employees/times/${params.time_id}`,
          "DELETE"
        );

        return {
          content: [
            {
              type: "text",
              text: `Time-tracking ${params.time_id} deleted successfully.`,
            },
          ],
          structuredContent: { deleted: true, id: params.time_id },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Employee Clock In
  server.registerTool(
    "holded_team_employee_clock_in",
    {
      title: "Employee Clock In",
      description: `Start counting employee time-tracking in Holded.

Args:
  - employee_id (string): The employee ID to clock in (required)
  - location (string): Location name (optional)

Returns:
  Confirmation with status, info, and time-tracking ID.`,
      inputSchema: EmployeeClockInInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: EmployeeClockInInput) => {
      try {
        const requestData: Record<string, unknown> = {};
        if (params.location) {
          requestData.location = params.location;
        }

        const result = await makeApiRequest<{ status: number; info: string; id: string; [key: string]: unknown }>(
          "team",
          `employees/${params.employee_id}/times/clockin`,
          "POST",
          requestData
        );

        return {
          content: [
            {
              type: "text",
              text: `Employee clocked in successfully.\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
          structuredContent: { clockedIn: true, employeeId: params.employee_id, ...result },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Employee Clock Out
  server.registerTool(
    "holded_team_employee_clock_out",
    {
      title: "Employee Clock Out",
      description: `End counting employee time-tracking in Holded.

Args:
  - employee_id (string): The employee ID to clock out (required)
  - latitude (string): Latitude (e.g., -7.45556) (optional)
  - longitude (string): Longitude (e.g., 55.55765) (optional)

Returns:
  Confirmation with status, info, and time-tracking ID.`,
      inputSchema: EmployeeClockOutInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: EmployeeClockOutInput) => {
      try {
        const requestData: Record<string, unknown> = {};
        if (params.latitude) {
          requestData.latitude = params.latitude;
        }
        if (params.longitude) {
          requestData.longitude = params.longitude;
        }

        const result = await makeApiRequest<{ status: number; info: string; id: string; [key: string]: unknown }>(
          "team",
          `employees/${params.employee_id}/times/clockout`,
          "POST",
          requestData
        );

        return {
          content: [
            {
              type: "text",
              text: `Employee clocked out successfully.\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
          structuredContent: { clockedOut: true, employeeId: params.employee_id, ...result },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Employee Pause
  server.registerTool(
    "holded_team_employee_pause",
    {
      title: "Employee Time-Tracking Pause",
      description: `Pause employee time-tracking in Holded.

Args:
  - employee_id (string): The employee ID to pause (required)
  - latitude (string): Latitude (e.g., -7.45556) (optional)
  - longitude (string): Longitude (e.g., 55.55765) (optional)

Returns:
  Confirmation with status, info, and time-tracking ID.`,
      inputSchema: EmployeePauseInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: EmployeePauseInput) => {
      try {
        const requestData: Record<string, unknown> = {};
        if (params.latitude) {
          requestData.latitude = params.latitude;
        }
        if (params.longitude) {
          requestData.longitude = params.longitude;
        }

        const result = await makeApiRequest<{ status: number; info: string; id: string; [key: string]: unknown }>(
          "team",
          `employees/${params.employee_id}/times/pause`,
          "POST",
          requestData
        );

        return {
          content: [
            {
              type: "text",
              text: `Employee time-tracking paused successfully.\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
          structuredContent: { paused: true, employeeId: params.employee_id, ...result },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Employee Unpause
  server.registerTool(
    "holded_team_employee_unpause",
    {
      title: "Employee Time-Tracking Unpause",
      description: `Unpause employee time-tracking in Holded.

Args:
  - employee_id (string): The employee ID to unpause (required)
  - latitude (string): Latitude (e.g., -7.45556) (optional)
  - longitude (string): Longitude (e.g., 55.55765) (optional)

Returns:
  Confirmation with status, info, and time-tracking ID.`,
      inputSchema: EmployeeUnpauseInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: EmployeeUnpauseInput) => {
      try {
        const requestData: Record<string, unknown> = {};
        if (params.latitude) {
          requestData.latitude = params.latitude;
        }
        if (params.longitude) {
          requestData.longitude = params.longitude;
        }

        const result = await makeApiRequest<{ status: number; info: string; id: string; [key: string]: unknown }>(
          "team",
          `employees/${params.employee_id}/times/unpause`,
          "POST",
          requestData
        );

        return {
          content: [
            {
              type: "text",
              text: `Employee time-tracking unpaused successfully.\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
          structuredContent: { unpaused: true, employeeId: params.employee_id, ...result },
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
