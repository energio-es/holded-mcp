/**
 * Event tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CrmEvent } from "../../types.js";
import {
  ListEventsInputSchema,
  GetEventInputSchema,
  CreateEventInputSchema,
  UpdateEventInputSchema,
  DeleteEventInputSchema,
} from "../../schemas/crm/events.js";
import { registerCrudTools } from "../factory.js";

/**
 * Format events as markdown
 */
export function formatEventsMarkdown(events: CrmEvent[]): string {
  if (!events.length) {
    return "No events found.";
  }

  const lines = ["# Events", "", `Found ${events.length} events:`, ""];

  for (const event of events) {
    lines.push(`## ${event.name}`);
    lines.push(`- **ID**: ${event.id}`);
    lines.push(`- **Start**: ${new Date(event.startDate * 1000).toLocaleString()}`);
    if (event.endDate) lines.push(`- **End**: ${new Date(event.endDate * 1000).toLocaleString()}`);
    if (event.leadId) lines.push(`- **Lead ID**: ${event.leadId}`);
    if (event.contactId) lines.push(`- **Contact ID**: ${event.contactId}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single event as markdown
 */
export function formatEventMarkdown(event: CrmEvent): string {
  const lines = [`# ${event.name}`, ""];
  lines.push(`- **ID**: ${event.id}`);
  lines.push(`- **Start**: ${new Date(event.startDate * 1000).toLocaleString()}`);
  if (event.endDate) lines.push(`- **End**: ${new Date(event.endDate * 1000).toLocaleString()}`);
  if (event.kind) lines.push(`- **Kind**: ${event.kind}`);
  if (event.status !== undefined) lines.push(`- **Status**: ${event.status}`);
  if (event.desc) lines.push(`- **Description**: ${event.desc}`);
  if (event.leadId) lines.push(`- **Lead ID**: ${event.leadId}`);
  if (event.contactId) lines.push(`- **Contact ID**: ${event.contactId}`);
  if (event.contactName) lines.push(`- **Contact Name**: ${event.contactName}`);

  return lines.join("\n");
}

/**
 * Register all event-related tools
 */
export function registerEventTools(server: McpServer): void {
  registerCrudTools<CrmEvent>(server, {
    module: "crm",
    toolPrefix: "holded_crm",
    resource: "event",
    resourcePlural: "events",
    endpoint: "events",
    idParam: "event_id",
    schemas: {
      list: ListEventsInputSchema,
      get: GetEventInputSchema,
      create: CreateEventInputSchema,
      update: UpdateEventInputSchema,
      delete: DeleteEventInputSchema,
    },
    titles: {
      list: "List Holded Events",
      get: "Get Holded Event",
      create: "Create Holded Event",
      update: "Update Holded Event",
      delete: "Delete Holded Event",
    },
    descriptions: {
      list: `List all events from Holded CRM.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of events with id, name, start, end, and associated lead/contact.`,
      get: `Get a specific event by ID from Holded CRM.

Args:
  - event_id (string): The event ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Event details including start, end, description, and associated entities.`,
      create: `Create a new event in Holded CRM.

Args:
  - name (string): Event name (required)
  - startDate (number): Start time as Unix timestamp (required)
  - duration (number): Duration in seconds
  - desc (string): Event description
  - leadId (string): Associated lead ID
  - contactId (string): Associated contact ID
  - userId (string): User ID to assign the event to

Returns:
  The created event with its assigned ID.`,
      update: `Update an existing event in Holded CRM.

Args:
  - event_id (string): The event ID to update (required)
  - name (string): Event name
  - startDate (number): Start time as Unix timestamp
  - duration (number): Duration in seconds
  - desc (string): Event description
  - leadId (string): Associated lead ID
  - contactId (string): Associated contact ID
  - userId (string): User ID to assign the event to

Returns:
  The updated event.`,
      delete: `Delete an event from Holded CRM.

Args:
  - event_id (string): The event ID to delete (required)

Returns:
  Confirmation of deletion.`,
    },
    formatters: {
      list: formatEventsMarkdown,
      single: formatEventMarkdown,
    },
  });
}
