/**
 * CRM module tools registration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerLeadTools } from "./leads.js";
import { registerFunnelTools } from "./funnels.js";
import { registerEventTools } from "./events.js";
import { registerBookingTools } from "./bookings.js";

/**
 * Register all CRM-related tools
 */
export function registerCrmTools(server: McpServer): void {
  registerLeadTools(server);
  registerFunnelTools(server);
  registerEventTools(server);
  registerBookingTools(server);
}
