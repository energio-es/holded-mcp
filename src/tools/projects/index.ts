/**
 * Projects module tools registration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerProjectTools } from "./projects.js";
import { registerTaskTools } from "./tasks.js";
import { registerProjectTimeTrackingTools } from "./time-tracking.js";

/**
 * Register all projects-related tools
 */
export function registerProjectsTools(server: McpServer): void {
  registerProjectTools(server);
  registerTaskTools(server);
  registerProjectTimeTrackingTools(server);
}
