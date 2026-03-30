/**
 * Accounting module tools registration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAccountTools } from "./accounts.js";
import { registerDailyLedgerTools } from "./daily-ledger.js";
import { registerAccountBalancesTools } from "./account-balances.js";

/**
 * Register all accounting-related tools
 */
export function registerAccountingTools(server: McpServer): void {
  registerAccountTools(server);
  registerDailyLedgerTools(server);
  registerAccountBalancesTools(server);
}
