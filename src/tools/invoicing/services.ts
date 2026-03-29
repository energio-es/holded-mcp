/**
 * Services tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError, toStructuredContent } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import {
  ListServicesInputSchema,
  GetServiceInputSchema,
  CreateServiceInputSchema,
  UpdateServiceInputSchema,
  DeleteServiceInputSchema,
  ListServicesInput,
  GetServiceInput,
  CreateServiceInput,
  UpdateServiceInput,
  DeleteServiceInput,
} from "../../schemas/invoicing/services.js";

/**
 * Format services as markdown
 */
function formatServicesMarkdown(services: Array<{ id: string; name: string; [key: string]: unknown }>): string {
  if (!services.length) {
    return "No services found.";
  }

  const lines = ["# Services", "", `Found ${services.length} services:`, ""];

  for (const service of services) {
    lines.push(`## ${service.name}`);
    lines.push(`- **ID**: ${service.id}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single service as markdown
 */
function formatServiceMarkdown(service: Record<string, unknown>): string {
  const lines = [`# ${service.name || "Service"}`, "", `**ID**: ${service.id}`, ""];

  if (service.desc) lines.push(`- **Description**: ${service.desc}`);
  if (service.subtotal !== undefined) lines.push(`- **Subtotal**: ${service.subtotal}`);
  if (service.tax !== undefined) lines.push(`- **Tax**: ${service.tax}`);
  if (service.cost !== undefined) lines.push(`- **Cost**: ${service.cost}`);
  if (service.salesChannelId) lines.push(`- **Sales Channel ID**: ${service.salesChannelId}`);
  if (service.tags && Array.isArray(service.tags) && service.tags.length > 0) {
    lines.push(`- **Tags**: ${service.tags.join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Register services tools
 */
export function registerServicesTools(server: McpServer): void {
  // List Services
  server.registerTool(
    "holded_invoicing_list_services",
    {
      title: "List Holded Services",
      description: `List all services from Holded.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of services with id and name.`,
      inputSchema: ListServicesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListServicesInput) => {
      try {
        const queryParams: Record<string, unknown> = {};
        if (params.page > 1) {
          queryParams.page = params.page;
        }

        const services = await makeApiRequest<Array<{ id: string; name: string; [key: string]: unknown }>>(
          "invoicing",
          "services",
          "GET",
          undefined,
          queryParams
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatServicesMarkdown(services)
            : JSON.stringify(services, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { services, count: services.length, page: params.page },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Get Service
  server.registerTool(
    "holded_invoicing_get_service",
    {
      title: "Get Holded Service",
      description: `Get a specific service by ID from Holded.

Args:
  - service_id (string): The service ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Service details including name, description, price, and other fields.`,
      inputSchema: GetServiceInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetServiceInput) => {
      try {
        const service = await makeApiRequest<Record<string, unknown>>(
          "invoicing",
          `services/${params.service_id}`,
          "GET"
        );

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatServiceMarkdown(service)
            : JSON.stringify(service, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: toStructuredContent(service),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Create Service
  server.registerTool(
    "holded_invoicing_create_service",
    {
      title: "Create Holded Service",
      description: `Create a new service in Holded.

Args:
  - name (string): Service name (required)
  - desc (string): Service description
  - tags (array): Service tags
  - tax (number): Tax rate
  - subtotal (number): Subtotal in cents
  - salesChannelId (string): Sales channel ID
  - cost (number): Service cost

Returns:
  The created service with its assigned ID.`,
      inputSchema: CreateServiceInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateServiceInput) => {
      try {
        const service = await makeApiRequest<Record<string, unknown>>(
          "invoicing",
          "services",
          "POST",
          params
        );

        return {
          content: [
            {
              type: "text",
              text: `Service created successfully.\n\n${JSON.stringify(service, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(service),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Update Service
  server.registerTool(
    "holded_invoicing_update_service",
    {
      title: "Update Holded Service",
      description: `Update an existing service in Holded. Only provided fields will be updated.

Args:
  - service_id (string): The service ID to update (required)
  - name (string): Service name
  - desc (string): Service description
  - tags (array): Service tags
  - tax (number): Tax rate
  - subtotal (number): Subtotal in cents
  - salesChannelId (string): Sales channel ID
  - cost (number): Service cost

Returns:
  The updated service.`,
      inputSchema: UpdateServiceInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: UpdateServiceInput) => {
      try {
        const { service_id, ...updateData } = params;
        const service = await makeApiRequest<Record<string, unknown>>(
          "invoicing",
          `services/${service_id}`,
          "PUT",
          updateData
        );

        return {
          content: [
            {
              type: "text",
              text: `Service updated successfully.\n\n${JSON.stringify(service, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(service),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Delete Service
  server.registerTool(
    "holded_invoicing_delete_service",
    {
      title: "Delete Holded Service",
      description: `Delete a service from Holded.

Args:
  - service_id (string): The service ID to delete (required)

Returns:
  Confirmation of deletion.`,
      inputSchema: DeleteServiceInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: DeleteServiceInput) => {
      try {
        await makeApiRequest<void>(
          "invoicing",
          `services/${params.service_id}`,
          "DELETE"
        );

        return {
          content: [
            {
              type: "text",
              text: `Service ${params.service_id} deleted successfully.`,
            },
          ],
          structuredContent: { deleted: true, id: params.service_id },
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
