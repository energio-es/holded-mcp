/**
 * Sales Channel tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ListSalesChannelsInputSchema,
  GetSalesChannelInputSchema,
  CreateSalesChannelInputSchema,
  UpdateSalesChannelInputSchema,
  DeleteSalesChannelInputSchema,
} from "../../schemas/invoicing/sales-channels.js";
import { registerCrudTools } from "../factory.js";

interface SalesChannel {
  id: string;
  name: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Format sales channels as markdown
 */
export function formatSalesChannelsMarkdown(channels: SalesChannel[]): string {
  if (!channels.length) {
    return "No sales channels found.";
  }

  const lines = ["# Sales Channels", "", `Found ${channels.length} sales channels:`, ""];

  for (const channel of channels) {
    lines.push(`## ${channel.name}`);
    lines.push(`- **ID**: ${channel.id}`);
    if (channel.description) lines.push(`- **Description**: ${channel.description}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single sales channel as markdown
 */
export function formatSalesChannelMarkdown(channel: SalesChannel): string {
  const lines = [`# ${channel.name}`, "", `**ID**: ${channel.id}`, ""];
  if (channel.description) lines.push(`- **Description**: ${channel.description}`);

  return lines.join("\n");
}

/**
 * Register all sales channel-related tools
 */
export function registerSalesChannelTools(server: McpServer): void {
  registerCrudTools<SalesChannel>(server, {
    module: "invoicing",
    toolPrefix: "holded_invoicing",
    resource: "sales_channel",
    resourcePlural: "sales_channels",
    endpoint: "saleschannels",
    idParam: "sales_channel_id",
    schemas: {
      list: ListSalesChannelsInputSchema,
      get: GetSalesChannelInputSchema,
      create: CreateSalesChannelInputSchema,
      update: UpdateSalesChannelInputSchema,
      delete: DeleteSalesChannelInputSchema,
    },
    titles: {
      list: "List Holded Sales Channels",
      get: "Get Holded Sales Channel",
      create: "Create Holded Sales Channel",
      update: "Update Holded Sales Channel",
      delete: "Delete Holded Sales Channel",
    },
    descriptions: {
      list: `List all sales channels from Holded.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of sales channels with id, name, and description.`,
      get: `Get a specific sales channel by ID from Holded.

Args:
  - sales_channel_id (string): The sales channel ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Sales channel details including name and description.`,
      create: `Create a new sales channel in Holded.

Args:
  - name (string): Sales channel name (required)
  - description (string): Sales channel description

Returns:
  The created sales channel with its assigned ID.`,
      update: `Update an existing sales channel in Holded.

Args:
  - sales_channel_id (string): The sales channel ID to update (required)
  - name (string): Sales channel name
  - description (string): Sales channel description

Returns:
  The updated sales channel.`,
      delete: `Delete a sales channel from Holded.

Args:
  - sales_channel_id (string): The sales channel ID to delete (required)

Returns:
  Confirmation of deletion.`,
    },
    formatters: {
      list: formatSalesChannelsMarkdown,
      single: formatSalesChannelMarkdown,
    },
  });
}
