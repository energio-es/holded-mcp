/**
 * Event tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError, toStructuredContent } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import { CrmEvent } from "../../types.js";
import {
  ListEventsInputSchema,
  GetEventInputSchema,
  CreateEventInputSchema,
  UpdateEventInputSchema,
  DeleteEventInputSchema,
  ListEventsInput,
  GetEventInput,
  CreateEventInput,
  UpdateEventInput,
  DeleteEventInput,
} from "../../schemas/crm/events.js";

/**
 * Register all event-related tools
 */
export function registerEventTools(server: McpServer): void {
  // List Events
  server.registerTool(
    "holded_crm_list_events",
    {
      title: "List Holded Events",
      description: `List all events from Holded CRM.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of events with id, name, start, end, and associated lead/contact.`,
      inputSchema: ListEventsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListEventsInput) => {
      try {
        const queryParams: Record<string, unknown> = {};
        if (params.page > 1) {
          queryParams.page = params.page;
        }

        const events = await makeApiRequest<CrmEvent[]>(
          "crm",
          "events",
          "GET",
          undefined,
          queryParams
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          if (!events.length) {
            textContent = "No events found.";
          } else {
            const lines = ["# Events", "", `Found ${events.length} events:`, ""];
            for (const event of events) {
              lines.push(`## ${event.name}`);
              lines.push(`- **ID**: ${event.id}`);
              lines.push(`- **Start**: ${new Date(event.start * 1000).toLocaleString()}`);
              if (event.end) lines.push(`- **End**: ${new Date(event.end * 1000).toLocaleString()}`);
              if (event.leadId) lines.push(`- **Lead ID**: ${event.leadId}`);
              if (event.contactId) lines.push(`- **Contact ID**: ${event.contactId}`);
              lines.push("");
            }
            textContent = lines.join("\n");
          }
        } else {
          textContent = JSON.stringify(events, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { events, count: events.length, page: params.page },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Get Event
  server.registerTool(
    "holded_crm_get_event",
    {
      title: "Get Holded Event",
      description: `Get a specific event by ID from Holded CRM.

Args:
  - event_id (string): The event ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Event details including start, end, description, and associated entities.`,
      inputSchema: GetEventInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetEventInput) => {
      try {
        const event = await makeApiRequest<CrmEvent>(
          "crm",
          `events/${params.event_id}`,
          "GET"
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines = [`# ${event.name}`, ""];
          lines.push(`- **ID**: ${event.id}`);
          lines.push(`- **Start**: ${new Date(event.start * 1000).toLocaleString()}`);
          if (event.end) lines.push(`- **End**: ${new Date(event.end * 1000).toLocaleString()}`);
          if (event.allDay !== undefined) lines.push(`- **All Day**: ${event.allDay ? "Yes" : "No"}`);
          if (event.description) lines.push(`- **Description**: ${event.description}`);
          if (event.leadId) lines.push(`- **Lead ID**: ${event.leadId}`);
          if (event.contactId) lines.push(`- **Contact ID**: ${event.contactId}`);
          if (event.assignedTo) lines.push(`- **Assigned To**: ${event.assignedTo}`);
          textContent = lines.join("\n");
        } else {
          textContent = JSON.stringify(event, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: toStructuredContent(event),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Create Event
  server.registerTool(
    "holded_crm_create_event",
    {
      title: "Create Holded Event",
      description: `Create a new event in Holded CRM.

Args:
  - name (string): Event name (required)
  - start (number): Start time as Unix timestamp (required)
  - end (number): End time as Unix timestamp
  - allDay (boolean): Whether the event is all-day
  - description (string): Event description
  - leadId (string): Associated lead ID
  - contactId (string): Associated contact ID
  - assignedTo (string): User ID to assign the event to

Returns:
  The created event with its assigned ID.`,
      inputSchema: CreateEventInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: CreateEventInput) => {
      try {
        const event = await makeApiRequest<CrmEvent>(
          "crm",
          "events",
          "POST",
          params
        );

        return {
          content: [
            {
              type: "text",
              text: `Event created successfully.\n\n${JSON.stringify(event, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(event),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Update Event
  server.registerTool(
    "holded_crm_update_event",
    {
      title: "Update Holded Event",
      description: `Update an existing event in Holded CRM.

Args:
  - event_id (string): The event ID to update (required)
  - name (string): Event name
  - start (number): Start time as Unix timestamp
  - end (number): End time as Unix timestamp
  - allDay (boolean): Whether the event is all-day
  - description (string): Event description
  - leadId (string): Associated lead ID
  - contactId (string): Associated contact ID
  - assignedTo (string): User ID to assign the event to

Returns:
  The updated event.`,
      inputSchema: UpdateEventInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: UpdateEventInput) => {
      try {
        const { event_id, ...updateData } = params;
        const event = await makeApiRequest<CrmEvent>(
          "crm",
          `events/${event_id}`,
          "PUT",
          updateData
        );

        return {
          content: [
            {
              type: "text",
              text: `Event updated successfully.\n\n${JSON.stringify(event, null, 2)}`,
            },
          ],
          structuredContent: toStructuredContent(event),
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Delete Event
  server.registerTool(
    "holded_crm_delete_event",
    {
      title: "Delete Holded Event",
      description: `Delete an event from Holded CRM.

Args:
  - event_id (string): The event ID to delete (required)

Returns:
  Confirmation of deletion.`,
      inputSchema: DeleteEventInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: DeleteEventInput) => {
      try {
        await makeApiRequest<void>(
          "crm",
          `events/${params.event_id}`,
          "DELETE"
        );

        return {
          content: [
            {
              type: "text",
              text: `Event ${params.event_id} deleted successfully.`,
            },
          ],
          structuredContent: { deleted: true, id: params.event_id },
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
