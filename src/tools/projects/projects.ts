/**
 * Project tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, toStructuredContent } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import { Project, ProjectSummary } from "../../types.js";
import {
  ListProjectsInputSchema,
  CreateProjectInputSchema,
  GetProjectInputSchema,
  UpdateProjectInputSchema,
  DeleteProjectInputSchema,
  GetProjectSummaryInputSchema,
  GetProjectSummaryInput,
} from "../../schemas/projects/projects.js";
import { registerCrudTools } from "../factory.js";
import { withErrorHandling } from "../utilities.js";

/**
 * Format projects as markdown
 */
export function formatProjectsMarkdown(projects: Project[]): string {
  if (!projects.length) {
    return "No projects found.";
  }

  const lines = ["# Projects", "", `Found ${projects.length} projects:`, ""];
  for (const project of projects) {
    lines.push(`## ${project.name}`);
    lines.push(`- **ID**: ${project.id}`);
    if (project.contactName) lines.push(`- **Contact**: ${project.contactName}`);
    if (project.status !== undefined) lines.push(`- **Status**: ${project.status}`);
    if (project.price !== undefined) lines.push(`- **Price**: ${project.price}`);
    if (project.numberOfTasks !== undefined) {
      lines.push(`- **Tasks**: ${project.completedTasks || 0}/${project.numberOfTasks} completed`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single project as markdown
 */
export function formatProjectMarkdown(project: Project): string {
  const lines = [`# ${project.name}`, ""];
  lines.push(`- **ID**: ${project.id}`);
  if (project.desc) lines.push(`- **Description**: ${project.desc}`);
  if (project.contactName) lines.push(`- **Contact**: ${project.contactName} (${project.contactId || "N/A"})`);
  if (project.status !== undefined) lines.push(`- **Status**: ${project.status}`);
  if (project.price !== undefined) lines.push(`- **Price**: ${project.price}`);
  if (project.date) lines.push(`- **Start Date**: ${new Date(project.date * 1000).toLocaleDateString()}`);
  if (project.dueDate) lines.push(`- **Due Date**: ${new Date(project.dueDate * 1000).toLocaleDateString()}`);
  if (project.billable !== undefined) lines.push(`- **Billable**: ${project.billable ? "Yes" : "No"}`);
  if (project.category !== undefined) lines.push(`- **Category**: ${project.category}`);
  // Task progress
  if (project.numberOfTasks !== undefined) {
    lines.push(`- **Tasks**: ${project.completedTasks || 0}/${project.numberOfTasks} completed`);
  }
  if (project.tags && project.tags.length > 0) {
    lines.push(`- **Tags**: ${project.tags.join(", ")}`);
  }
  // Labels
  if (project.labels && project.labels.length > 0) {
    const labelNames = project.labels.map(l => l.name || l.labelName).filter(Boolean);
    if (labelNames.length > 0) {
      lines.push(`- **Labels**: ${labelNames.join(", ")}`);
    }
  }

  return lines.join("\n");
}

/**
 * Register all project-related tools
 */
export function registerProjectTools(server: McpServer): void {
  // ── Standard CRUD via factory ───────────────────────────
  registerCrudTools<Project>(server, {
    module: "projects",
    toolPrefix: "holded_projects",
    resource: "project",
    resourcePlural: "projects",
    endpoint: "projects",
    idParam: "project_id",
    schemas: {
      list: ListProjectsInputSchema,
      get: GetProjectInputSchema,
      create: CreateProjectInputSchema,
      update: UpdateProjectInputSchema,
      delete: DeleteProjectInputSchema,
    },
    titles: {
      list: "List Holded Projects",
      get: "Get Holded Project",
      create: "Create Holded Project",
      update: "Update Holded Project",
      delete: "Delete Holded Project",
    },
    descriptions: {
      list: `List all projects from Holded.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of projects with id, name, desc, status, price, contactId, contactName, date, dueDate,
  category, lists, billable, numberOfTasks, completedTasks, labels, and linked documents.`,
      get: `Get a specific project by ID from Holded.

Args:
  - project_id (string): The project ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Project details including name, desc, status, price, date, dueDate, contactId, contactName,
  category, lists, billable, numberOfTasks, completedTasks, labels, and linked documents.`,
      create: `Create a new project in Holded.

Args:
  - name (string): Project name (required)

Returns:
  The created project with status, info, and assigned ID.`,
      update: `Update an existing project in Holded.

Args:
  - project_id (string): The project ID to update (required)
  - name (string): Project name
  - desc (string): Project description
  - tags (string[]): Project tags
  - contactName (string): Contact name
  - date (number): Start date as Unix timestamp
  - dueDate (number): Due date as Unix timestamp
  - status (number): Project status
  - billable (number): Billable flag (0 or 1)
  - price (number): Project price

Returns:
  The updated project.`,
      delete: `Delete a project from Holded.

Args:
  - project_id (string): The project ID to delete (required)

Returns:
  Confirmation of deletion.`,
    },
    formatters: {
      list: formatProjectsMarkdown,
      single: formatProjectMarkdown,
    },
  });

  // ── Manual tools (non-standard endpoints) ───────────────

  // Get Project Summary
  server.registerTool(
    "holded_projects_get_project_summary",
    {
      title: "Get Holded Project Summary",
      description: `Get a summary/overview of a project from Holded.

Args:
  - project_id (string): The project ID to get summary for (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Project summary including projectEvolution, profitability, economicStatus, and task statistics.`,
      inputSchema: GetProjectSummaryInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const typedParams = params as unknown as GetProjectSummaryInput;
      const summary = await makeApiRequest<ProjectSummary>(
        "projects",
        `projects/${typedParams.project_id}/summary`,
        "GET"
      );

      let textContent: string;
      if (typedParams.response_format === ResponseFormat.MARKDOWN) {
        const lines = [`# Project Summary`, ""];
        if (summary.name) lines.push(`- **Name**: ${summary.name}`);
        if (summary.desc) lines.push(`- **Description**: ${summary.desc}`);
        if (summary.projectEvolution) {
          const tasks = summary.projectEvolution.tasks;
          lines.push(`- **Tasks**: ${tasks.completed}/${tasks.total} completed`);
          if (summary.projectEvolution.dueDate) {
            lines.push(`- **Due Date**: ${new Date(summary.projectEvolution.dueDate * 1000).toLocaleDateString()}`);
          }
        }
        if (summary.profitability) {
          lines.push("", "### Profitability");
          lines.push(`- **Sales**: ${summary.profitability.sales}`);
          lines.push(`- **Expenses**: ${summary.profitability.expenses.total}`);
          lines.push(`- **Profit**: ${summary.profitability.profit}`);
        }
        if (summary.economicStatus) {
          lines.push("", "### Economic Status");
          lines.push(`- **Sales**: ${summary.economicStatus.sales}`);
          lines.push(`- **Quoted**: ${summary.economicStatus.quoted}`);
          lines.push(`- **Billed**: ${summary.economicStatus.billed}`);
          lines.push(`- **Collected**: ${summary.economicStatus.collected}`);
          lines.push(`- **Remaining**: ${summary.economicStatus.remaining}`);
        }
        textContent = lines.join("\n");
      } else {
        textContent = JSON.stringify(summary, null, 2);
      }

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: toStructuredContent(summary),
      };
    })
  );
}
