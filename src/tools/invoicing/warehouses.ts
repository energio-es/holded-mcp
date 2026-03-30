/**
 * Warehouse tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Warehouse } from "../../types.js";
import {
  ListWarehousesInputSchema,
  GetWarehouseInputSchema,
  CreateWarehouseInputSchema,
  UpdateWarehouseInputSchema,
  DeleteWarehouseInputSchema,
} from "../../schemas/invoicing/warehouses.js";
import { registerCrudTools } from "../factory.js";

/**
 * Format warehouses as markdown
 */
export function formatWarehousesMarkdown(warehouses: Warehouse[]): string {
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
export function formatWarehouseMarkdown(warehouse: Warehouse): string {
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
  registerCrudTools<Warehouse>(server, {
    module: "invoicing",
    toolPrefix: "holded_invoicing",
    resource: "warehouse",
    resourcePlural: "warehouses",
    endpoint: "warehouses",
    idParam: "warehouse_id",
    schemas: {
      list: ListWarehousesInputSchema,
      get: GetWarehouseInputSchema,
      create: CreateWarehouseInputSchema,
      update: UpdateWarehouseInputSchema,
      delete: DeleteWarehouseInputSchema,
    },
    titles: {
      list: "List Holded Warehouses",
      get: "Get Holded Warehouse",
      create: "Create Holded Warehouse",
      update: "Update Holded Warehouse",
      delete: "Delete Holded Warehouse",
    },
    descriptions: {
      list: `List all warehouses from Holded.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of warehouses with id, name, address, and status.`,
      get: `Get a specific warehouse by ID from Holded.

Args:
  - warehouse_id (string): The warehouse ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Warehouse details including name, address, and status.`,
      create: `Create a new warehouse in Holded.

Args:
  - name (string): Warehouse name (required)
  - address (object): Warehouse address
  - active (boolean): Whether the warehouse is active

Returns:
  The created warehouse with its assigned ID.`,
      update: `Update an existing warehouse in Holded.

Args:
  - warehouse_id (string): The warehouse ID to update (required)
  - name (string): Warehouse name
  - address (object): Warehouse address
  - active (boolean): Whether the warehouse is active

Returns:
  The updated warehouse.`,
      delete: `Delete a warehouse from Holded.

Args:
  - warehouse_id (string): The warehouse ID to delete (required)

Returns:
  Confirmation of deletion.`,
    },
    formatters: {
      list: formatWarehousesMarkdown,
      single: formatWarehouseMarkdown,
    },
  });
}
