/**
 * Project tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError, toStructuredContent } from "../../services/api.js";
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

/**
 * Format projects as markdown
 */
function formatProjectsMarkdown(projects: Project[]): string {
  if (!projects.length) {
    return "No projects found.";
  }

  const lines = ["# Projects", "", `Found ${projects.length} projects:`, ""];
  for (const project of projects) {
    lines.push(`## ${project.name}`);
    lines.push(`- **ID**: ${project.id}`);
    if (project.contactName) lines.push(`- **Contact**: ${project.contactName}`);
    // Handle status as number (API returns integer)
    if (project.status !== undefined) lines.push(`- **Status**: ${project.status}`);
    // Use price (API field) or budget (legacy)
    const budget = project.price ?? project.budget;
    if (budget !== undefined) lines.push(`- **Price/Budget**: ${budget}`);
    // Task progress
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
function formatProjectMarkdown(project: Project): string {
  const lines = [`# ${project.name}`, ""];
  lines.push(`- **ID**: ${project.id}`);
  // Use desc (API field) or description (legacy)
  const description = project.desc || project.description;
  if (description) lines.push(`- **Description**: ${description}`);
  if (project.contactName) lines.push(`- **Contact**: ${project.contactName} (${project.contactId || "N/A"})`);
  if (project.status !== undefined) lines.push(`- **Status**: ${project.status}`);
  // Use price (API field) or budget (legacy)
  const budget = project.price ?? project.budget;
  if (budget !== undefined) lines.push(`- **Price/Budget**: ${budget}`);
  // Use date (API field) or startDate (legacy)
  const startDate = project.date || project.startDate;
  if (startDate) lines.push(`- **Start Date**: ${new Date(startDate * 1000).toLocaleDateString()}`);
  // dueDate is the actual API field name
  const endDate = project.dueDate || project.endDate;
  if (endDate) lines.push(`- **Due Date**: ${new Date(endDate * 1000).toLocaleDateString()}`);
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
  Project summary including total hours, costs, revenue, and task statistics.`,
      inputSchema: GetProjectSummaryInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetProjectSummaryInput) => {
      try {
        const summary = await makeApiRequest<ProjectSummary>(
          "projects",
          `projects/${params.project_id}/summary`,
          "GET"
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines = [`# Project Summary`, ""];
          lines.push(`- **Project ID**: ${summary.projectId}`);
          if (summary.totalHours !== undefined) lines.push(`- **Total Hours**: ${summary.totalHours}`);
          if (summary.totalCost !== undefined) lines.push(`- **Total Cost**: ${summary.totalCost}`);
          if (summary.totalRevenue !== undefined) lines.push(`- **Total Revenue**: ${summary.totalRevenue}`);
          if (summary.tasksCompleted !== undefined) lines.push(`- **Tasks Completed**: ${summary.tasksCompleted}`);
          if (summary.tasksTotal !== undefined) lines.push(`- **Total Tasks**: ${summary.tasksTotal}`);
          textContent = lines.join("\n");
        } else {
          textContent = JSON.stringify(summary, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: toStructuredContent(summary),
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
