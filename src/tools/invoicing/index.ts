/**
 * Invoicing module tools registration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerContactTools } from "./contacts.js";
import { registerProductTools } from "./products.js";
import { registerDocumentTools } from "./documents.js";
import { registerPaymentTools } from "./payments.js";
import { registerTreasuryTools } from "./treasury.js";
import { registerNumberingSeriesTools } from "./numbering-series.js";
import { registerWarehouseTools } from "./warehouses.js";
import { registerServicesTools } from "./services.js";
import { registerTaxesTools } from "./taxes.js";
import { registerSalesChannelTools } from "./sales-channels.js";
import { registerExpensesAccountTools } from "./expenses-accounts.js";
import { registerRemittanceTools } from "./remittances.js";

/**
 * Register all invoicing-related tools
 */
export function registerInvoicingTools(server: McpServer): void {
  registerContactTools(server);
  registerProductTools(server);
  registerDocumentTools(server);
  registerPaymentTools(server);
  registerTreasuryTools(server);
  registerNumberingSeriesTools(server);
  registerWarehouseTools(server);
  registerServicesTools(server);
  registerTaxesTools(server);
  registerSalesChannelTools(server);
  registerExpensesAccountTools(server);
  registerRemittanceTools(server);
}
