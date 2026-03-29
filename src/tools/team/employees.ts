/**
 * Employee tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError, toStructuredContent } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import { Employee } from "../../types.js";
import {
  ListEmployeesInputSchema,
  GetEmployeeInputSchema,
  CreateEmployeeInputSchema,
  UpdateEmployeeInputSchema,
  DeleteEmployeeInputSchema,
  ListEmployeesInput,
  GetEmployeeInput,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  DeleteEmployeeInput,
} from "../../schemas/team/employees.js";

/**
 * Format employees as markdown
 */
function formatEmployeesMarkdown(employees: Employee[]): string {
  if (!employees.length) {
    return "No employees found.";
  }

  const lines = ["# Employees", "", `Found ${employees.length} employees:`, ""];

  for (const employee of employees) {
    lines.push(`## ${employee.name}`);
    lines.push(`- **ID**: ${employee.id}`);
    if (employee.email) lines.push(`- **Email**: ${employee.email}`);
    if (employee.phone) lines.push(`- **Phone**: ${employee.phone}`);
    if (employee.position) lines.push(`- **Position**: ${employee.position}`);
    if (employee.department) lines.push(`- **Department**: ${employee.department}`);
    if (employee.status) lines.push(`- **Status**: ${employee.status}`);
    if (employee.hireDate) lines.push(`- **Hire Date**: ${new Date(employee.hireDate * 1000).toLocaleDateString()}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single employee as markdown
 */
function formatEmployeeMarkdown(employee: Employee): string {
  const lines = [`# ${employee.name}`, "", `**ID**: ${employee.id}`, ""];

  if (employee.email) lines.push(`- **Email**: ${employee.email}`);
  if (employee.phone) lines.push(`- **Phone**: ${employee.phone}`);
  if (employee.position) lines.push(`- **Position**: ${employee.position}`);
  if (employee.department) lines.push(`- **Department**: ${employee.department}`);
  if (employee.status) lines.push(`- **Status**: ${employee.status}`);
  if (employee.hireDate) lines.push(`- **Hire Date**: ${new Date(employee.hireDate * 1000).toLocaleDateString()}`);

  return lines.join("\n");
}

/**
 * Register all employee-related tools
 */
export function registerEmployeeTools(server: McpServer): void {
  // List Employees
  server.registerTool(
    "holded_team_list_employees",
    {
      title: "List Holded Employees",
      description: `List all employees from Holded.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of employees with id, name, email, position, department, and status.`,
      inputSchema: ListEmployeesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListEmployeesInput) => {
      try {
        const queryParams: Record<string, unknown> = {};
        if (params.page > 1) {
          queryParams.page = params.page;
        }

        const employees = await makeApiRequest<Employee[]>(
          "team",
          "employees",
          "GET",
          undefined,
          queryParams
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatEmployeesMarkdown(employees)
            : JSON.stringify(employees, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { employees, count: employees.length, page: params.page },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Get Employee
  server.registerTool(
    "holded_team_get_employee",
    {
      title: "Get Holded Employee",
      description: `Get a specific employee by ID from Holded.

Args:
  - employee_id (string): The employee ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Employee details including name, email, position, department, and status.`,
      inputSchema: GetEmployeeInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetEmployeeInput) => {
      try {
        const employee = await makeApiRequest<Employee>(
          "team",
          `employees/${params.employee_id}`,
          "GET"
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatEmployeeMarkdown(employee)
            : JSON.stringify(employee, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: toStructuredContent(employee),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Create Employee
  server.registerTool(
    "holded_team_create_employee",
    {
      title: "Create Holded Employee",
      description: `Create a new employee in Holded.

According to Holded Team API v1.0.1, employee creation supports:
  - name (string): Employee name (required)
  - lastName (string): Employee last name (required)
  - email (string): Email address (required)
  - sendInvite (boolean): Whether to send invitation email to the employee (optional)

Additional fields like phone, position, department should be set via Update Employee after creation.

Returns:
  The created employee with its assigned ID.`,
      inputSchema: CreateEmployeeInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateEmployeeInput) => {
      try {
        const employee = await makeApiRequest<Employee>(
          "team",
          "employees",
          "POST",
          params
        );

        return {
          content: [
            {
              type: "text",
              text: `Employee created successfully.\n\n${JSON.stringify(employee, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(employee),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Update Employee
  server.registerTool(
    "holded_team_update_employee",
    {
      title: "Update Holded Employee",
      description: `Update an existing employee in Holded.

Args:
  - employee_id (string): The employee ID to update (required)
  - name (string): Employee name
  - lastName (string): Employee last name
  - mainEmail (string): Main email address
  - email (string): Email address
  - nationality (string): Nationality
  - phone (string): Phone number
  - mobile (string): Mobile phone number
  - dateOfBirth (string): Date of birth (dd/mm/yyyy)
  - gender ('male' | 'female'): Gender
  - mainLanguage (string): Main language
  - iban (string): Bank IBAN
  - timeOffPolicyId (string): Time off policy ID
  - timeOffSupervisors (array): Array of supervisor employee IDs
  - reportingTo (string): Reporting manager employee ID
  - code (string): NIF/tax identification number
  - socialSecurityNum (string): Social security number
  - address (object): Address object with address, city, postalCode, province, country
  - fiscalResidence (boolean): Fiscal residence (set to false to use fiscalAddress)
  - fiscalAddress (object): Fiscal address (requires fiscalResidence to be false)
  - workplace (string): Workplace ID
  - teams (array): Array of team IDs
  - holdedUserId (string): Holded user ID

Returns:
  Confirmation with status, info, and employee ID.`,
      inputSchema: UpdateEmployeeInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: UpdateEmployeeInput) => {
      try {
        const { employee_id, ...updateData } = params;
        const result = await makeApiRequest<{ status: number; info: string; id: string;[key: string]: unknown }>(
          "team",
          `employees/${employee_id}`,
          "PUT",
          updateData
        );

        return {
          content: [
            {
              type: "text",
              text: `Employee updated successfully.\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
          structuredContent: { updated: true, employeeId: employee_id, ...result },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Delete Employee
  server.registerTool(
    "holded_team_delete_employee",
    {
      title: "Delete Holded Employee",
      description: `Delete an employee from Holded.

Args:
  - employee_id (string): The employee ID to delete (required)

Returns:
  Confirmation of deletion.`,
      inputSchema: DeleteEmployeeInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: DeleteEmployeeInput) => {
      try {
        await makeApiRequest<void>(
          "team",
          `employees/${params.employee_id}`,
          "DELETE"
        );

        return {
          content: [
            {
              type: "text",
              text: `Employee ${params.employee_id} deleted successfully.`,
            },
          ],
          structuredContent: { deleted: true, id: params.employee_id },
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
