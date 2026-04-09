#!/usr/bin/env node
/**
 * MCP Server for Holded API
 *
 * This server provides 70+ comprehensive tools to interact with Holded's REST API,
 * including invoicing (documents, contacts, products, payments, treasury), CRM (leads,
 * funnels, events, bookings), Projects (projects, tasks), and Accounting (accounts,
 * daily ledger).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getApiKey } from "./services/api.js";
import { registerInvoicingTools } from "./tools/invoicing/index.js";
import { registerCrmTools } from "./tools/crm/index.js";
import { registerProjectsTools } from "./tools/projects/index.js";
import { registerAccountingTools } from "./tools/accounting/index.js";
import { registerTeamTools } from "./tools/team/index.js";

/**
 * Available modules with their registration functions
 */
const AVAILABLE_MODULES = {
  invoicing: registerInvoicingTools,
  crm: registerCrmTools,
  projects: registerProjectsTools,
  accounting: registerAccountingTools,
  team: registerTeamTools,
} as const;

type ModuleName = keyof typeof AVAILABLE_MODULES;

/**
 * Parse HOLDED_MODULES environment variable and return enabled module names
 * If not set, returns all available modules (default behavior)
 */
function getEnabledModules(): ModuleName[] {
  const modulesEnv = process.env.HOLDED_MODULES;

  if (!modulesEnv) {
    // Default: all modules enabled
    return Object.keys(AVAILABLE_MODULES) as ModuleName[];
  }

  const requested = modulesEnv.split(",").map((m) => m.trim().toLowerCase());
  const valid = requested.filter(
    (m) => m in AVAILABLE_MODULES
  ) as ModuleName[];

  // Warn about invalid module names
  const invalid = requested.filter((m) => !(m in AVAILABLE_MODULES));
  if (invalid.length > 0) {
    console.error(
      `Warning: Unknown modules ignored: ${invalid.join(", ")}`
    );
    console.error(
      `Available modules: ${Object.keys(AVAILABLE_MODULES).join(", ")}`
    );
  }

  return valid;
}

/**
 * Create and configure the MCP server
 */
const server = new McpServer({
  name: "@energio/holded-mcp",
  version: "1.2.1",
});

// Register only enabled modules
const enabledModules = getEnabledModules();
for (const moduleName of enabledModules) {
  AVAILABLE_MODULES[moduleName](server);
}

/**
 * Main function to run the server via stdio
 */
async function main(): Promise<void> {
  // Validate API key is available
  try {
    getApiKey();
  } catch {
    console.error("ERROR: HOLDED_API_KEY environment variable is required.");
    console.error("Get your API key from https://app.holded.com/api");
    process.exit(1);
  }

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdio servers should not log to stdout)
  console.error("Holded MCP server running via stdio");
  console.error("API key configured and ready");
  console.error(`Enabled modules: ${enabledModules.join(", ")}`);
}

// Run the server
main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
