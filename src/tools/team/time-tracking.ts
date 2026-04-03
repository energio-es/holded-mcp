/**
 * Time Tracking tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, toStructuredContent } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import { TimeTracking } from "../../types.js";
import { withErrorHandling } from "../utilities.js";
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
export function formatTimeTrackingsMarkdown(times: TimeTracking[]): string {
  if (!times.length) {
    return "No time-trackings found.";
  }

  const lines = ["# Time Trackings", "", `Found ${times.length} time entries:`, ""];

  for (const time of times) {
    lines.push(`## ${time.employeeName || `Employee ${time.employeeId}`}`);
    lines.push(`- **ID**: ${time.id}`);
    if (time.date?.date) lines.push(`- **Date**: ${time.date.date}`);
    lines.push(`- **Hours**: ${(time.time / 3600).toFixed(1)}`);
    if (time.status) lines.push(`- **Status**: ${time.status}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single time-tracking as markdown
 */
export function formatTimeTrackingMarkdown(time: TimeTracking): string {
  const lines = [`# Time Tracking Entry`, "", `**ID**: ${time.id}`, ""];
  lines.push(`- **Employee**: ${time.employeeName || time.employeeId}`);
  if (time.date?.date) lines.push(`- **Date**: ${time.date.date}`);
  lines.push(`- **Hours**: ${(time.time / 3600).toFixed(1)}`);
  if (time.status) lines.push(`- **Status**: ${time.status}`);

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
  Array of time-trackings with id, employee, time, and status.`,
      inputSchema: ListAllTimeTrackingsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { page, response_format } = params as unknown as ListAllTimeTrackingsInput;
      const queryParams: Record<string, unknown> = {};
      if (page > 1) {
        queryParams.page = page;
      }

      const response = await makeApiRequest<{ employeesTimeTracking: TimeTracking[] }>(
        "team",
        "employees/times",
        "GET",
        undefined,
        queryParams
      );
      const times = response.employeesTimeTracking ?? [];

      const textContent =
        response_format === ResponseFormat.MARKDOWN
          ? formatTimeTrackingsMarkdown(times)
          : JSON.stringify(times, null, 2);

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: { timeTrackings: times, count: times.length, page },
      };
    })
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
  Array of time-trackings for the employee with id, time, and status.`,
      inputSchema: ListEmployeeTimeTrackingsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { employee_id, page, response_format } = params as unknown as ListEmployeeTimeTrackingsInput;
      const queryParams: Record<string, unknown> = {};
      if (page > 1) {
        queryParams.page = page;
      }

      const response = await makeApiRequest<{ employeesTimeTracking: TimeTracking[] }>(
        "team",
        `employees/${employee_id}/times`,
        "GET",
        undefined,
        queryParams
      );
      const times = response.employeesTimeTracking ?? [];

      const textContent =
        response_format === ResponseFormat.MARKDOWN
          ? formatTimeTrackingsMarkdown(times)
          : JSON.stringify(times, null, 2);

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: { timeTrackings: times, count: times.length, page },
      };
    })
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
  Time-tracking details including employee, time, and status.`,
      inputSchema: GetTimeTrackingInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { time_id, response_format } = params as unknown as GetTimeTrackingInput;
      const time = await makeApiRequest<TimeTracking>(
        "team",
        `employees/times/${time_id}`,
        "GET"
      );

      const textContent =
        response_format === ResponseFormat.MARKDOWN
          ? formatTimeTrackingMarkdown(time)
          : JSON.stringify(time, null, 2);

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: toStructuredContent(time),
      };
    })
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
    withErrorHandling(async (params) => {
      const { employee_id, startTmp, endTmp } = params as unknown as CreateEmployeeTimeTrackingInput;
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
    })
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
    withErrorHandling(async (params) => {
      const { time_id, startTmp, endTmp } = params as unknown as UpdateTimeTrackingInput;
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
    })
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
    withErrorHandling(async (params) => {
      const { time_id } = params as unknown as DeleteTimeTrackingInput;
      await makeApiRequest<void>(
        "team",
        `employees/times/${time_id}`,
        "DELETE"
      );

      return {
        content: [
          {
            type: "text",
            text: `Time-tracking ${time_id} deleted successfully.`,
          },
        ],
        structuredContent: { deleted: true, id: time_id },
      };
    })
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
    withErrorHandling(async (params) => {
      const { employee_id, location } = params as unknown as EmployeeClockInInput;
      const requestData: Record<string, unknown> = {};
      if (location) {
        requestData.location = location;
      }

      const result = await makeApiRequest<{ status: number; info: string; id: string; [key: string]: unknown }>(
        "team",
        `employees/${employee_id}/times/clockin`,
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
        structuredContent: { clockedIn: true, employeeId: employee_id, ...result },
      };
    })
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
    withErrorHandling(async (params) => {
      const { employee_id, latitude, longitude } = params as unknown as EmployeeClockOutInput;
      const requestData: Record<string, unknown> = {};
      if (latitude) {
        requestData.latitude = latitude;
      }
      if (longitude) {
        requestData.longitude = longitude;
      }

      const result = await makeApiRequest<{ status: number; info: string; id: string; [key: string]: unknown }>(
        "team",
        `employees/${employee_id}/times/clockout`,
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
        structuredContent: { clockedOut: true, employeeId: employee_id, ...result },
      };
    })
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
    withErrorHandling(async (params) => {
      const { employee_id, latitude, longitude } = params as unknown as EmployeePauseInput;
      const requestData: Record<string, unknown> = {};
      if (latitude) {
        requestData.latitude = latitude;
      }
      if (longitude) {
        requestData.longitude = longitude;
      }

      const result = await makeApiRequest<{ status: number; info: string; id: string; [key: string]: unknown }>(
        "team",
        `employees/${employee_id}/times/pause`,
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
        structuredContent: { paused: true, employeeId: employee_id, ...result },
      };
    })
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
    withErrorHandling(async (params) => {
      const { employee_id, latitude, longitude } = params as unknown as EmployeeUnpauseInput;
      const requestData: Record<string, unknown> = {};
      if (latitude) {
        requestData.latitude = latitude;
      }
      if (longitude) {
        requestData.longitude = longitude;
      }

      const result = await makeApiRequest<{ status: number; info: string; id: string; [key: string]: unknown }>(
        "team",
        `employees/${employee_id}/times/unpause`,
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
        structuredContent: { unpaused: true, employeeId: employee_id, ...result },
      };
    })
  );
}
