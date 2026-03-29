/**
 * Accounting module tools registration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAccountTools } from "./accounts.js";
import { registerDailyLedgerTools } from "./daily-ledger.js";

/**
 * Register all accounting-related tools
 */
export function registerAccountingTools(server: McpServer): void {
  registerAccountTools(server);
  registerDailyLedgerTools(server);
}
