/**
 * Employee tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Employee } from "../../types.js";
import {
  ListEmployeesInputSchema,
  GetEmployeeInputSchema,
  CreateEmployeeInputSchema,
  UpdateEmployeeInputSchema,
  DeleteEmployeeInputSchema,
} from "../../schemas/team/employees.js";
import { registerCrudTools } from "../factory.js";

/**
 * Format employees as markdown
 */
export function formatEmployeesMarkdown(employees: Employee[]): string {
  if (!employees.length) {
    return "No employees found.";
  }

  const lines = ["# Employees", "", `Found ${employees.length} employees:`, ""];

  for (const employee of employees) {
    lines.push(`## ${employee.name}${employee.lastName ? ` ${employee.lastName}` : ""}`);
    lines.push(`- **ID**: ${employee.id}`);
    if (employee.mainEmail) lines.push(`- **Main Email**: ${employee.mainEmail}`);
    if (employee.email) lines.push(`- **Email**: ${employee.email}`);
    if (employee.phone) lines.push(`- **Phone**: ${employee.phone}`);
    if (employee.title) lines.push(`- **Title**: ${employee.title}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single employee as markdown
 */
export function formatEmployeeMarkdown(employee: Employee): string {
  const lines = [`# ${employee.name}${employee.lastName ? ` ${employee.lastName}` : ""}`, "", `**ID**: ${employee.id}`, ""];

  if (employee.mainEmail) lines.push(`- **Main Email**: ${employee.mainEmail}`);
  if (employee.email) lines.push(`- **Email**: ${employee.email}`);
  if (employee.phone) lines.push(`- **Phone**: ${employee.phone}`);
  if (employee.title) lines.push(`- **Title**: ${employee.title}`);

  return lines.join("\n");
}

/**
 * Register all employee-related tools
 */
export function registerEmployeeTools(server: McpServer): void {
  registerCrudTools<Employee>(server, {
    module: "team",
    toolPrefix: "holded_team",
    resource: "employee",
    resourcePlural: "employees",
    endpoint: "employees",
    listResponseKey: "employees",
    idParam: "employee_id",
    schemas: {
      list: ListEmployeesInputSchema,
      get: GetEmployeeInputSchema,
      create: CreateEmployeeInputSchema,
      update: UpdateEmployeeInputSchema,
      delete: DeleteEmployeeInputSchema,
    },
    titles: {
      list: "List Holded Employees",
      get: "Get Holded Employee",
      create: "Create Holded Employee",
      update: "Update Holded Employee",
      delete: "Delete Holded Employee",
    },
    descriptions: {
      list: `List all employees from Holded.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of employees with id, name, lastName, email, title, and phone.`,
      get: `Get a specific employee by ID from Holded.

Args:
  - employee_id (string): The employee ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Employee details including name, lastName, email, title, and phone.`,
      create: `Create a new employee in Holded.

According to Holded Team API v1.0.1, employee creation supports:
  - name (string): Employee name (required)
  - lastName (string): Employee last name (required)
  - email (string): Email address (required)
  - sendInvite (boolean): Whether to send invitation email to the employee (optional)

Additional fields like phone, title, etc. should be set via Update Employee after creation.

Returns:
  The created employee with its assigned ID.`,
      update: `Update an existing employee in Holded.

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
      delete: `Delete an employee from Holded.

Args:
  - employee_id (string): The employee ID to delete (required)

Returns:
  Confirmation of deletion.`,
    },
    formatters: {
      list: formatEmployeesMarkdown,
      single: formatEmployeeMarkdown,
    },
  });
}
