/**
 * Booking tools for Holded API
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import { Booking, BookingLocation, BookingAmount } from "../../types.js";
import {
  ListBookingsInputSchema,
  CreateBookingInputSchema,
  UpdateBookingInputSchema,
  GetBookingInputSchema,
  DeleteBookingInputSchema,
  ListBookingLocationsInputSchema,
  GetAvailableSlotsInputSchema,
  ListBookingLocationsInput,
  GetAvailableSlotsInput,
} from "../../schemas/crm/bookings.js";
import { registerCrudTools } from "../factory.js";

/**
 * Format bookings as markdown
 */
function formatBookingsMarkdown(bookings: Booking[]): string {
  if (!bookings.length) {
    return "No bookings found.";
  }

  const lines = ["# Bookings", "", `Found ${bookings.length} bookings:`, ""];
  for (const booking of bookings) {
    // Get service name for display
    const serviceName = Array.isArray(booking.service)
      ? booking.service[0]?.name
      : booking.service?.name;
    lines.push(`## ${serviceName || `Booking ${booking.id}`}`);
    lines.push(`- **ID**: ${booking.id}`);
    lines.push(`- **Start**: ${new Date(booking.startTime * 1000).toLocaleString()}`);
    lines.push(`- **End**: ${new Date(booking.endTime * 1000).toLocaleString()}`);
    lines.push(`- **Duration**: ${Math.round(booking.duration / 60)} min`);
    if (booking.status) lines.push(`- **Status**: ${booking.status}`);
    // Get space name if available
    const spaceName = Array.isArray(booking.space)
      ? booking.space[0]?.name
      : booking.space?.name;
    if (spaceName) lines.push(`- **Space**: ${spaceName}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a single booking as markdown
 */
function formatBookingMarkdown(booking: Booking): string {
  // Get service name for display
  const serviceName = Array.isArray(booking.service)
    ? booking.service[0]?.name
    : booking.service?.name;
  const lines = [`# ${serviceName || `Booking ${booking.id}`}`, ""];
  lines.push(`- **ID**: ${booking.id}`);
  lines.push(`- **Start**: ${new Date(booking.startTime * 1000).toLocaleString()}`);
  lines.push(`- **End**: ${new Date(booking.endTime * 1000).toLocaleString()}`);
  lines.push(`- **Duration**: ${Math.round(booking.duration / 60)} min`);
  if (booking.status) lines.push(`- **Status**: ${booking.status}`);
  // Get space info if available
  const space = Array.isArray(booking.space) ? booking.space[0] : booking.space;
  if (space) lines.push(`- **Space**: ${space.name} (ID: ${space.id})`);
  // Get service details
  const service = Array.isArray(booking.service) ? booking.service[0] : booking.service;
  if (service) {
    lines.push("");
    lines.push("### Service");
    lines.push(`- **Name**: ${service.name}`);
    if (service.description) lines.push(`- **Description**: ${service.description}`);
    // Handle array format for total (API may return as array or object)
    if (service.total) {
      const total: BookingAmount | undefined = Array.isArray(service.total) ? service.total[0] : service.total;
      if (total) lines.push(`- **Total**: ${total.amount} ${total.currency}`);
    }
  }
  // Show custom fields if available (handle both field names from API)
  const customFieldsList = booking.customFieldsValues ?? booking.customFields;
  if (customFieldsList?.length) {
    lines.push("");
    lines.push("### Custom Fields");
    for (const field of customFieldsList) {
      lines.push(`- **${field.label}**: ${field.value}`);
    }
  }

  return lines.join("\n");
}

/**
 * Register all booking-related tools
 */
export function registerBookingTools(server: McpServer): void {
  // ── Standard CRUD via factory ───────────────────────────
  registerCrudTools<Booking>(server, {
    module: "crm",
    toolPrefix: "holded_crm",
    resource: "booking",
    resourcePlural: "bookings",
    endpoint: "bookings",
    idParam: "booking_id",
    schemas: {
      list: ListBookingsInputSchema,
      get: GetBookingInputSchema,
      create: CreateBookingInputSchema,
      update: UpdateBookingInputSchema,
      delete: DeleteBookingInputSchema,
    },
    titles: {
      list: "List Holded Bookings",
      get: "Get Holded Booking",
      create: "Create Holded Booking",
      update: "Update Holded Booking",
      delete: "Cancel Holded Booking",
    },
    descriptions: {
      list: `List all bookings from Holded CRM.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of bookings with id, startTime, endTime, duration, status, service, space, and customFieldsValues.`,
      get: `Get a specific booking by ID from Holded CRM.

Args:
  - booking_id (string): The booking ID to retrieve (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Booking details including startTime, endTime, duration, status, service, space, outcome, and customFieldsValues.`,
      create: `Create a new booking in Holded CRM.

Args:
  - locationId (string): Location ID for the booking (required)
  - serviceId (string): Service ID for the booking (required)
  - dateTime (number): Booking date and time as Unix timestamp (required)
  - timezone (string): Timezone (e.g., 'Europe/Luxembourg') (required)
  - language (string): Language code (e.g., 'es', 'en') (required)
  - customFields (array): Array of custom fields with key-value pairs (required)
    Typically includes:
    - key: "name", value: customer name
    - key: "email", value: customer email

Returns:
  The created booking with status and id.`,
      update: `Update an existing booking in Holded CRM. Only the params included in the operation will update the booking.

Args:
  - booking_id (string): The booking ID to update (required)
  - dateTime (number): Booking date and time as Unix timestamp (optional)
  - customFields (array): Array of custom fields with key-value pairs (optional)
    Each custom field should have:
    - key (string): Custom field key
    - value (string): Custom field value

Returns:
  Confirmation with status and booking ID.`,
      delete: `Cancel a booking in Holded CRM.

Note: This endpoint cancels the booking (the Holded API calls this operation "Cancel Booking").

Args:
  - booking_id (string): The booking ID to cancel (required)

Returns:
  Confirmation of deletion.`,
    },
    formatters: {
      list: formatBookingsMarkdown,
      single: formatBookingMarkdown,
    },
  });

  // ── Manual tools (non-standard endpoints) ───────────────

  // List Booking Locations
  server.registerTool(
    "holded_crm_list_booking_locations",
    {
      title: "List Holded Booking Locations",
      description: `List all booking locations from Holded CRM.

Args:
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of booking locations with id, name, description, active status, and availableServices.`,
      inputSchema: ListBookingLocationsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListBookingLocationsInput) => {
      try {
        const locations = await makeApiRequest<BookingLocation[]>(
          "crm",
          "bookings/locations",
          "GET"
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          if (!locations.length) {
            textContent = "No booking locations found.";
          } else {
            const lines = ["# Booking Locations", "", `Found ${locations.length} locations:`, ""];
            for (const loc of locations) {
              lines.push(`## ${loc.name}`);
              lines.push(`- **ID**: ${loc.id}`);
              if (loc.description) lines.push(`- **Description**: ${loc.description}`);
              lines.push(`- **Active**: ${loc.active ? "Yes" : "No"}`);
              if (loc.availableServices?.length) {
                lines.push(`- **Available Services**: ${loc.availableServices.length} service(s)`);
                for (const serviceId of loc.availableServices) {
                  lines.push(`  - ${serviceId}`);
                }
              }
              lines.push("");
            }
            textContent = lines.join("\n");
          }
        } else {
          textContent = JSON.stringify(locations, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { locations, count: locations.length },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    }
  );

  // Get Available Slots
  server.registerTool(
    "holded_crm_get_available_slots",
    {
      title: "Get Holded Available Booking Slots",
      description: `Get available time slots for a specific booking location from Holded CRM.

Args:
  - location_id (string): The location ID (required)
  - serviceId (string): Service ID (required)
  - day (string): Day in yyyy-mm-dd format (required)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Array of available time slots for the location with dateTime, from, to, and duration.`,
      inputSchema: GetAvailableSlotsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetAvailableSlotsInput) => {
      try {
        // API requires serviceId and day as query parameters
        const queryParams: Record<string, unknown> = {
          serviceId: params.serviceId,
          day: params.day,
        };

        const slots = await makeApiRequest<Array<{ dateTime: number; from: string; to: string; duration: number; [key: string]: unknown }>>(
          "crm",
          `bookings/locations/${params.location_id}/slots`,
          "GET",
          undefined,
          queryParams
        );

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          if (!slots.length) {
            textContent = "No available slots found for this location.";
          } else {
            const lines = ["# Available Booking Slots", "", `Found ${slots.length} slots:`, ""];
            for (const slot of slots) {
              lines.push(`- **${slot.from}** to **${slot.to}** (${Math.round(slot.duration / 60)} min)`);
            }
            textContent = lines.join("\n");
          }
        } else {
          textContent = JSON.stringify(slots, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { slots, count: slots.length, locationId: params.location_id },
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
