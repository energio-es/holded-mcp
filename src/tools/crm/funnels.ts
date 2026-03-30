/**
 * Funnel tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Funnel } from "../../types.js";
import {
  ListFunnelsInputSchema,
  CreateFunnelInputSchema,
  UpdateFunnelInputSchema,
  GetFunnelInputSchema,
  DeleteFunnelInputSchema,
} from "../../schemas/crm/funnels.js";
import { registerCrudTools } from "../factory.js";

/**
 * Format funnels as markdown
 */
export function formatFunnelsMarkdown(funnels: Funnel[]): string {
  if (!funnels.length) {
    return "No funnels found.";
  }

  const lines = ["# Sales Funnels", "", `Found ${funnels.length} funnels:`, ""];

  for (const funnel of funnels) {
    lines.push(`## ${funnel.name}`);
    lines.push(`- **ID**: ${funnel.id}`);
    if (funnel.stages && funnel.stages.length > 0) {
      lines.push("- **Stages**:");
      for (const stage of funnel.stages) {
        lines.push(`  - ${stage.name} (ID: ${stage.id}, Order: ${stage.order})`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single funnel as markdown
 */
export function formatFunnelMarkdown(funnel: Funnel): string {
  const lines = [`# ${funnel.name}`, ""];
  lines.push(`- **ID**: ${funnel.id}`);
  if (funnel.stages && funnel.stages.length > 0) {
    lines.push("", "## Stages");
    for (const stage of funnel.stages) {
      lines.push(`- **${stage.name}** (ID: ${stage.id}, Order: ${stage.order})`);
    }
  }

  return lines.join("\n");
}

/**
 * Register all funnel-related tools
 */
export function registerFunnelTools(server: McpServer): void {
  registerCrudTools<Funnel>(server, {
    module: "crm",
    toolPrefix: "holded_crm",
    resource: "funnel",
    resourcePlural: "funnels",
    endpoint: "funnels",
    idParam: "funnel_id",
    schemas: {
      list: ListFunnelsInputSchema,
      get: GetFunnelInputSchema,
      create: CreateFunnelInputSchema,
      update: UpdateFunnelInputSchema,
      delete: DeleteFunnelInputSchema,
    },
    titles: {
      list: "List Holded Funnels",
      get: "Get Holded Funnel",
      create: "Create Holded Funnel",
      update: "Update Holded Funnel",
      delete: "Delete Holded Funnel",
    },
    descriptions: {
      list: `List all sales funnels from Holded CRM.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of funnels with id, name, and stages.`,
      get: `Get a specific funnel by ID from Holded CRM.

Args:
  - funnel_id (string): The funnel ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Funnel details including name and stages.`,
      create: `Create a new sales funnel in Holded CRM.

Args:
  - name (string): Funnel name (required)
  - stages (array): Initial funnel stages with name, order, and probability

Returns:
  The created funnel with its assigned ID.`,
      update: `Update an existing sales funnel in Holded CRM.

Args:
  - funnel_id (string): The funnel ID to update (required)
  - name (string): Funnel name
  - stages (array): Updated funnel stages

Returns:
  The updated funnel.`,
      delete: `Delete a funnel from Holded CRM.

Args:
  - funnel_id (string): The funnel ID to delete (required)

Returns:
  Confirmation of deletion.`,
    },
    formatters: {
      list: formatFunnelsMarkdown,
      single: formatFunnelMarkdown,
    },
  });
}
