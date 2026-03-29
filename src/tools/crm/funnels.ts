/**
 * Funnel tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError, toStructuredContent } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import { Funnel } from "../../types.js";
import {
  ListFunnelsInputSchema,
  CreateFunnelInputSchema,
  UpdateFunnelInputSchema,
  GetFunnelInputSchema,
  DeleteFunnelInputSchema,
  ListFunnelsInput,
  CreateFunnelInput,
  UpdateFunnelInput,
  GetFunnelInput,
  DeleteFunnelInput,
} from "../../schemas/crm/funnels.js";

/**
 * Register all funnel-related tools
 */
export function registerFunnelTools(server: McpServer): void {
  // List Funnels
  server.registerTool(
    "holded_crm_list_funnels",
    {
      title: "List Holded Funnels",
      description: `List all sales funnels from Holded CRM.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of funnels with id, name, and stages.`,
      inputSchema: ListFunnelsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListFunnelsInput) => {
      try {
        const funnels = await makeApiRequest<Funnel[]>(
          "crm",
          "funnels",
          "GET"
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          if (!funnels.length) {
            textContent = "No funnels found.";
          } else {
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
            textContent = lines.join("\n");
          }
        } else {
          textContent = JSON.stringify(funnels, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { funnels, count: funnels.length },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Create Funnel
  server.registerTool(
    "holded_crm_create_funnel",
    {
      title: "Create Holded Funnel",
      description: `Create a new sales funnel in Holded CRM.

Args:
  - name (string): Funnel name (required)
  - stages (array): Initial funnel stages with name, order, and probability

Returns:
  The created funnel with its assigned ID.`,
      inputSchema: CreateFunnelInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateFunnelInput) => {
      try {
        const funnel = await makeApiRequest<Funnel>(
          "crm",
          "funnels",
          "POST",
          params
        );

        return {
          content: [
            {
              type: "text",
              text: `Funnel created successfully.\n\n${JSON.stringify(funnel, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(funnel),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Update Funnel
  server.registerTool(
    "holded_crm_update_funnel",
    {
      title: "Update Holded Funnel",
      description: `Update an existing sales funnel in Holded CRM.

Args:
  - funnel_id (string): The funnel ID to update (required)
  - name (string): Funnel name
  - stages (array): Updated funnel stages

Returns:
  The updated funnel.`,
      inputSchema: UpdateFunnelInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: UpdateFunnelInput) => {
      try {
        const { funnel_id, ...updateData } = params;
        const funnel = await makeApiRequest<Funnel>(
          "crm",
          `funnels/${funnel_id}`,
          "PUT",
          updateData
        );

        return {
          content: [
            {
              type: "text",
              text: `Funnel updated successfully.\n\n${JSON.stringify(funnel, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(funnel),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Get Funnel
  server.registerTool(
    "holded_crm_get_funnel",
    {
      title: "Get Holded Funnel",
      description: `Get a specific funnel by ID from Holded CRM.

Args:
  - funnel_id (string): The funnel ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Funnel details including name and stages.`,
      inputSchema: GetFunnelInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetFunnelInput) => {
      try {
        const funnel = await makeApiRequest<Funnel>(
          "crm",
          `funnels/${params.funnel_id}`,
          "GET"
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines = [`# ${funnel.name}`, ""];
          lines.push(`- **ID**: ${funnel.id}`);
          if (funnel.stages && funnel.stages.length > 0) {
            lines.push("", "## Stages");
            for (const stage of funnel.stages) {
              lines.push(`- **${stage.name}** (ID: ${stage.id}, Order: ${stage.order})`);
            }
          }
          textContent = lines.join("\n");
        } else {
          textContent = JSON.stringify(funnel, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: toStructuredContent(funnel),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Delete Funnel
  server.registerTool(
    "holded_crm_delete_funnel",
    {
      title: "Delete Holded Funnel",
      description: `Delete a funnel from Holded CRM.

Args:
  - funnel_id (string): The funnel ID to delete (required)

Returns:
  Confirmation of deletion.`,
      inputSchema: DeleteFunnelInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: DeleteFunnelInput) => {
      try {
        await makeApiRequest<void>(
          "crm",
          `funnels/${params.funnel_id}`,
          "DELETE"
        );

        return {
          content: [
            {
              type: "text",
              text: `Funnel ${params.funnel_id} deleted successfully.`,
            },
          ],
          structuredContent: { deleted: true, id: params.funnel_id },
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
