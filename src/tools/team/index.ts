/**
 * Team module tools registration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerEmployeeTools } from "./employees.js";
import { registerTimeTrackingTools } from "./time-tracking.js";

/**
 * Register all team-related tools
 */
export function registerTeamTools(server: McpServer): void {
  registerEmployeeTools(server);
  registerTimeTrackingTools(server);
}
