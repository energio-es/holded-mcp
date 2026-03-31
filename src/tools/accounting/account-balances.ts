/**
 * Account Balances tool for Holded API
 *
 * Computes accurate, date-scoped per-account debit/credit/balance totals
 * by aggregating from individual daily ledger entries. Uses CET-aligned
 * timestamps to prevent cross-fiscal-year leakage.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import type { LedgerEntryLine, AccountBalance } from "../../types.js";
import { withErrorHandling } from "../utilities.js";
import {
  AccountBalancesInputSchema,
  AccountBalancesInput,
} from "../../schemas/accounting/account-balances.js";
import { datesToApiRange } from "../../utils/timezone.js";

/** Maximum entry lines per page returned by the daily ledger API (docs say 500, actual is 250) */
const LEDGER_PAGE_SIZE = 250;

/**
 * Account metadata from list_accounts, used for enrichment.
 */
interface AccountMetadata {
  num: number;
  name: string;
  group: string;
  [key: string]: unknown;
}

/**
 * Resolve the date range input to { starttmp, endtmp } timestamps.
 */
function resolveTimestamps(params: AccountBalancesInput): { starttmp: number; endtmp: number } {
  if (params.raw_timestamps) {
    return { starttmp: params.starttmp!, endtmp: params.endtmp! };
  }
  return datesToApiRange(params.start_date!, params.end_date!);
}

/**
 * Fetch all daily ledger entry lines for a date range, auto-paginating.
 */
async function fetchAllLedgerEntries(
  starttmp: number,
  endtmp: number,
): Promise<{ entries: LedgerEntryLine[]; pagesFetched: number }> {
  const allEntries: LedgerEntryLine[] = [];
  let page = 1;

  while (true) {
    const queryParams: Record<string, unknown> = { starttmp, endtmp };
    if (page > 1) {
      queryParams.page = page;
    }

    const pageEntries = await makeApiRequest<LedgerEntryLine[]>(
      "accounting",
      "dailyledger",
      "GET",
      undefined,
      queryParams,
    );

    allEntries.push(...pageEntries);

    if (pageEntries.length < LEDGER_PAGE_SIZE) {
      break;
    }
    page++;
  }

  return { entries: allEntries, pagesFetched: page };
}

/**
 * Filter out opening balance entries if not requested.
 * Simple type-based filter — CET-aligned boundaries prevent cross-year leakage.
 *
 * Exported for unit testing.
 */
export function filterOpeningEntries(
  entries: LedgerEntryLine[],
  includeOpening: boolean,
): { filtered: LedgerEntryLine[]; openingExcluded: boolean } {
  if (includeOpening) {
    return { filtered: entries, openingExcluded: false };
  }

  let openingExcluded = false;
  const filtered: LedgerEntryLine[] = [];

  for (const e of entries) {
    if (e.type === "opening") {
      openingExcluded = true;
    } else {
      filtered.push(e);
    }
  }

  return { filtered, openingExcluded };
}

/**
 * Aggregate daily ledger entries into per-account debit/credit totals.
 *
 * Exported for unit testing.
 */
export function aggregateByAccount(
  entries: LedgerEntryLine[],
): Map<number, { debit: number; credit: number }> {
  const map = new Map<number, { debit: number; credit: number }>();

  for (const e of entries) {
    let acc = map.get(e.account);
    if (!acc) {
      acc = { debit: 0, credit: 0 };
      map.set(e.account, acc);
    }
    acc.debit += e.debit;
    acc.credit += e.credit;
  }

  return map;
}

/**
 * Format account balances as markdown
 */
export function formatAccountBalancesMarkdown(accounts: AccountBalance[]): string {
  if (!accounts.length) {
    return "No account balances found for the requested period.";
  }

  const lines = [
    "# Account Balances",
    "",
    `Found ${accounts.length} accounts:`,
    "",
    "| Account | Name | Group | Debit | Credit | Balance |",
    "|---------|------|-------|------:|-------:|--------:|",
  ];

  for (const a of accounts) {
    lines.push(
      `| ${a.num} | ${a.name} | ${a.group} | ${a.debit.toFixed(2)} | ${a.credit.toFixed(2)} | ${a.balance.toFixed(2)} |`
    );
  }

  return lines.join("\n");
}

/**
 * Register the account balances tool.
 */
export function registerAccountBalancesTools(server: McpServer): void {
  server.registerTool(
    "holded_accounting_list_account_balances",
    {
      title: "Holded Accounting Account Balances",
      description: `Compute accurate, date-scoped per-account debit/credit/balance totals.

Aggregates from individual daily ledger entries to produce correct period-scoped balances. Dates are interpreted in Spanish local time (CET/CEST).

Use this tool when you need account totals for a specific period (P&L, trial balance, balance sheet).

Args (default mode — recommended):
  - start_date (string): Period start date in YYYY-MM-DD format
  - end_date (string): Period end date in YYYY-MM-DD format (inclusive)

Args (raw timestamp mode — set raw_timestamps: true):
  - starttmp (number): Period start as Unix timestamp (CET-aligned recommended)
  - endtmp (number): Period end as Unix timestamp (CET-aligned recommended)
  - raw_timestamps (boolean): Must be true to use timestamp mode

Additional args:
  - account_filter (number[]): Filter to specific account numbers (optional, returns all if omitted)
  - include_opening (boolean): Include opening balance entry in totals (default: false — set true for balance sheet, false for P&L)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Per-account debit/credit/balance totals with period metadata.`,
      inputSchema: AccountBalancesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const typedParams = params as unknown as AccountBalancesInput;

      // 1. Resolve dates to timestamps
      const { starttmp, endtmp } = resolveTimestamps(typedParams);

      // 2. Fetch all ledger entries (auto-paginate)
      const { entries, pagesFetched } = await fetchAllLedgerEntries(starttmp, endtmp);

      // 3. Filter opening entries if not requested
      const { filtered, openingExcluded } = filterOpeningEntries(
        entries,
        typedParams.include_opening,
      );

      // 4. Aggregate by account
      const totals = aggregateByAccount(filtered);

      // 5. Enrich with account metadata from list_accounts
      const accountMeta = await makeApiRequest<AccountMetadata[]>(
        "accounting",
        "chartofaccounts",
        "GET",
        undefined,
        { starttmp, endtmp, includeEmpty: 0 },
      );
      const metaByNum = new Map<number, AccountMetadata>();
      for (const a of accountMeta) {
        metaByNum.set(a.num, a);
      }

      // 6. Build result
      let accounts: AccountBalance[] = [];
      for (const [num, { debit, credit }] of totals) {
        const meta = metaByNum.get(num);
        accounts.push({
          num,
          name: meta?.name ?? String(num),
          group: meta?.group ?? "",
          debit: Math.round(debit * 100) / 100,
          credit: Math.round(credit * 100) / 100,
          balance: Math.round((debit - credit) * 100) / 100,
        });
      }

      // 7. Apply account filter
      if (typedParams.account_filter && typedParams.account_filter.length > 0) {
        const filterSet = new Set(typedParams.account_filter);
        accounts = accounts.filter((a) => filterSet.has(a.num));
      }

      // Sort by account number
      accounts.sort((a, b) => a.num - b.num);

      const structured = {
        accounts,
        count: accounts.length,
        period: { starttmp, endtmp },
        opening_balance_excluded: openingExcluded,
        pages_fetched: pagesFetched,
      };

      const textContent =
        typedParams.response_format === ResponseFormat.MARKDOWN
          ? formatAccountBalancesMarkdown(accounts)
          : JSON.stringify(structured, null, 2);

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: structured,
      };
    }),
  );
}
