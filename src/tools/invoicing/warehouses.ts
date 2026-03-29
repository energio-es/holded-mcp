/**
 * Warehouse tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError, toStructuredContent } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import { Warehouse } from "../../types.js";
import {
  ListWarehousesInputSchema,
  GetWarehouseInputSchema,
  CreateWarehouseInputSchema,
  UpdateWarehouseInputSchema,
  DeleteWarehouseInputSchema,
  ListWarehousesInput,
  GetWarehouseInput,
  CreateWarehouseInput,
  UpdateWarehouseInput,
  DeleteWarehouseInput,
} from "../../schemas/invoicing/warehouses.js";

/**
 * Format warehouses as markdown
 */
function formatWarehousesMarkdown(warehouses: Warehouse[]): string {
  if (!warehouses.length) {
    return "No warehouses found.";
  }

  const lines = ["# Warehouses", "", `Found ${warehouses.length} warehouses:`, ""];

  for (const warehouse of warehouses) {
    lines.push(`## ${warehouse.name}`);
    lines.push(`- **ID**: ${warehouse.id}`);
    if (warehouse.address) {
      const addr = warehouse.address;
      if (addr.address) lines.push(`- **Address**: ${addr.address}`);
      if (addr.city) lines.push(`- **City**: ${addr.city}`);
      if (addr.postalCode) lines.push(`- **Postal Code**: ${addr.postalCode}`);
      if (addr.country) lines.push(`- **Country**: ${addr.country}`);
    }
    if (warehouse.active !== undefined) lines.push(`- **Active**: ${warehouse.active ? "Yes" : "No"}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single warehouse as markdown
 */
function formatWarehouseMarkdown(warehouse: Warehouse): string {
  const lines = [`# ${warehouse.name}`, "", `**ID**: ${warehouse.id}`, ""];

  if (warehouse.address) {
    lines.push("### Address");
    const addr = warehouse.address;
    if (addr.address) lines.push(`- ${addr.address}`);
    if (addr.city) lines.push(`- ${addr.city}`);
    if (addr.postalCode) lines.push(`- ${addr.postalCode}`);
    if (addr.province) lines.push(`- ${addr.province}`);
    if (addr.country) lines.push(`- ${addr.country}`);
    lines.push("");
  }

  if (warehouse.active !== undefined) lines.push(`- **Active**: ${warehouse.active ? "Yes" : "No"}`);

  return lines.join("\n");
}

/**
 * Register all warehouse-related tools
 */
export function registerWarehouseTools(server: McpServer): void {
  // List Warehouses
  server.registerTool(
    "holded_invoicing_list_warehouses",
    {
      title: "List Holded Warehouses",
      description: `List all warehouses from Holded.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of warehouses with id, name, address, and status.`,
      inputSchema: ListWarehousesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListWarehousesInput) => {
      try {
        const queryParams: Record<string, unknown> = {};
        if (params.page > 1) {
          queryParams.page = params.page;
        }

        const warehouses = await makeApiRequest<Warehouse[]>(
          "invoicing",
          "warehouses",
          "GET",
          undefined,
          queryParams
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatWarehousesMarkdown(warehouses)
            : JSON.stringify(warehouses, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { warehouses, count: warehouses.length, page: params.page },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Get Warehouse
  server.registerTool(
    "holded_invoicing_get_warehouse",
    {
      title: "Get Holded Warehouse",
      description: `Get a specific warehouse by ID from Holded.

Args:
  - warehouse_id (string): The warehouse ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Warehouse details including name, address, and status.`,
      inputSchema: GetWarehouseInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetWarehouseInput) => {
      try {
        const warehouse = await makeApiRequest<Warehouse>(
          "invoicing",
          `warehouses/${params.warehouse_id}`,
          "GET"
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatWarehouseMarkdown(warehouse)
            : JSON.stringify(warehouse, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: toStructuredContent(warehouse),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Create Warehouse
  server.registerTool(
    "holded_invoicing_create_warehouse",
    {
      title: "Create Holded Warehouse",
      description: `Create a new warehouse in Holded.

Args:
  - name (string): Warehouse name (required)
  - address (object): Warehouse address
  - active (boolean): Whether the warehouse is active

Returns:
  The created warehouse with its assigned ID.`,
      inputSchema: CreateWarehouseInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateWarehouseInput) => {
      try {
        const warehouse = await makeApiRequest<Warehouse>(
          "invoicing",
          "warehouses",
          "POST",
          params
        );

        return {
          content: [
            {
              type: "text",
              text: `Warehouse created successfully.\n\n${JSON.stringify(warehouse, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(warehouse),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Update Warehouse
  server.registerTool(
    "holded_invoicing_update_warehouse",
    {
      title: "Update Holded Warehouse",
      description: `Update an existing warehouse in Holded.

Args:
  - warehouse_id (string): The warehouse ID to update (required)
  - name (string): Warehouse name
  - address (object): Warehouse address
  - active (boolean): Whether the warehouse is active

Returns:
  The updated warehouse.`,
      inputSchema: UpdateWarehouseInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: UpdateWarehouseInput) => {
      try {
        const { warehouse_id, ...updateData } = params;
        const warehouse = await makeApiRequest<Warehouse>(
          "invoicing",
          `warehouses/${warehouse_id}`,
          "PUT",
          updateData
        );

        return {
          content: [
            {
              type: "text",
              text: `Warehouse updated successfully.\n\n${JSON.stringify(warehouse, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(warehouse),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Delete Warehouse
  server.registerTool(
    "holded_invoicing_delete_warehouse",
    {
      title: "Delete Holded Warehouse",
      description: `Delete a warehouse from Holded.

Args:
  - warehouse_id (string): The warehouse ID to delete (required)

Returns:
  Confirmation of deletion.`,
      inputSchema: DeleteWarehouseInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: DeleteWarehouseInput) => {
      try {
        await makeApiRequest<void>(
          "invoicing",
          `warehouses/${params.warehouse_id}`,
          "DELETE"
        );

        return {
          content: [
            {
              type: "text",
              text: `Warehouse ${params.warehouse_id} deleted successfully.`,
            },
          ],
          structuredContent: { deleted: true, id: params.warehouse_id },
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
