/**
 * Sales Channel tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError, toStructuredContent } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import {
  ListSalesChannelsInputSchema,
  GetSalesChannelInputSchema,
  CreateSalesChannelInputSchema,
  UpdateSalesChannelInputSchema,
  DeleteSalesChannelInputSchema,
  ListSalesChannelsInput,
  GetSalesChannelInput,
  CreateSalesChannelInput,
  UpdateSalesChannelInput,
  DeleteSalesChannelInput,
} from "../../schemas/invoicing/sales-channels.js";

interface SalesChannel {
  id: string;
  name: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Format sales channels as markdown
 */
function formatSalesChannelsMarkdown(channels: SalesChannel[]): string {
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
function formatSalesChannelMarkdown(channel: SalesChannel): string {
  const lines = [`# ${channel.name}`, "", `**ID**: ${channel.id}`, ""];
  if (channel.description) lines.push(`- **Description**: ${channel.description}`);

  return lines.join("\n");
}

/**
 * Register all sales channel-related tools
 */
export function registerSalesChannelTools(server: McpServer): void {
  // List Sales Channels
  server.registerTool(
    "holded_invoicing_list_sales_channels",
    {
      title: "List Holded Sales Channels",
      description: `List all sales channels from Holded.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of sales channels with id, name, and description.`,
      inputSchema: ListSalesChannelsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListSalesChannelsInput) => {
      try {
        const queryParams: Record<string, unknown> = {};
        if (params.page > 1) {
          queryParams.page = params.page;
        }

        const channels = await makeApiRequest<SalesChannel[]>(
          "invoicing",
          "saleschannels",
          "GET",
          undefined,
          queryParams
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatSalesChannelsMarkdown(channels)
            : JSON.stringify(channels, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { salesChannels: channels, count: channels.length, page: params.page },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Get Sales Channel
  server.registerTool(
    "holded_invoicing_get_sales_channel",
    {
      title: "Get Holded Sales Channel",
      description: `Get a specific sales channel by ID from Holded.

Args:
  - sales_channel_id (string): The sales channel ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Sales channel details including name and description.`,
      inputSchema: GetSalesChannelInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetSalesChannelInput) => {
      try {
        const channel = await makeApiRequest<SalesChannel>(
          "invoicing",
          `saleschannels/${params.sales_channel_id}`,
          "GET"
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatSalesChannelMarkdown(channel)
            : JSON.stringify(channel, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: toStructuredContent(channel),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Create Sales Channel
  server.registerTool(
    "holded_invoicing_create_sales_channel",
    {
      title: "Create Holded Sales Channel",
      description: `Create a new sales channel in Holded.

Args:
  - name (string): Sales channel name (required)
  - description (string): Sales channel description

Returns:
  The created sales channel with its assigned ID.`,
      inputSchema: CreateSalesChannelInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateSalesChannelInput) => {
      try {
        const channel = await makeApiRequest<SalesChannel>(
          "invoicing",
          "saleschannels",
          "POST",
          params
        );

        return {
          content: [
            {
              type: "text",
              text: `Sales channel created successfully.\n\n${JSON.stringify(channel, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(channel),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Update Sales Channel
  server.registerTool(
    "holded_invoicing_update_sales_channel",
    {
      title: "Update Holded Sales Channel",
      description: `Update an existing sales channel in Holded.

Args:
  - sales_channel_id (string): The sales channel ID to update (required)
  - name (string): Sales channel name
  - description (string): Sales channel description

Returns:
  The updated sales channel.`,
      inputSchema: UpdateSalesChannelInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: UpdateSalesChannelInput) => {
      try {
        const { sales_channel_id, ...updateData } = params;
        const channel = await makeApiRequest<SalesChannel>(
          "invoicing",
          `saleschannels/${sales_channel_id}`,
          "PUT",
          updateData
        );

        return {
          content: [
            {
              type: "text",
              text: `Sales channel updated successfully.\n\n${JSON.stringify(channel, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(channel),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Delete Sales Channel
  server.registerTool(
    "holded_invoicing_delete_sales_channel",
    {
      title: "Delete Holded Sales Channel",
      description: `Delete a sales channel from Holded.

Args:
  - sales_channel_id (string): The sales channel ID to delete (required)

Returns:
  Confirmation of deletion.`,
      inputSchema: DeleteSalesChannelInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: DeleteSalesChannelInput) => {
      try {
        await makeApiRequest<void>(
          "invoicing",
          `saleschannels/${params.sales_channel_id}`,
          "DELETE"
        );

        return {
          content: [
            {
              type: "text",
              text: `Sales channel ${params.sales_channel_id} deleted successfully.`,
            },
          ],
          structuredContent: { deleted: true, id: params.sales_channel_id },
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
