/**
 * Account Balances tool for Holded API
 *
 * Computes accurate, date-scoped per-account debit/credit/balance totals
 * by aggregating from individual daily ledger entries with cross-fiscal-year
 * leak filtering.
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
 * Entry types that legitimately appear at the fiscal year boundary timestamp.
 * Any other type at that timestamp is considered a cross-year leak.
 */
const BOUNDARY_SAFE_TYPES = new Set(["opening", "vat_regularization"]);

/**
 * Filter out cross-fiscal-year leaked entries from daily ledger results.
 *
 * Detection uses two signals:
 * 1. Entries sharing the same timestamp as the opening balance entry are candidates.
 * 2. Candidates are confirmed as leaked if their entryNumber also appears at a
 *    different timestamp (duplicate = different fiscal year).
 * 3. Fallback: candidates at the opening timestamp whose type is not "opening" or
 *    "vat_regularization" are excluded even without a duplicate entryNumber.
 *
 * Exported for unit testing.
 */
export function filterLeakedEntries(
  entries: LedgerEntryLine[],
  includeOpening: boolean,
): { filtered: LedgerEntryLine[]; leakedCount: number; openingExcluded: boolean } {
  if (entries.length === 0) {
    return { filtered: [], leakedCount: 0, openingExcluded: false };
  }

  // Step 1: Find opening entry timestamps
  const openingTimestamps = new Set<number>();
  for (const e of entries) {
    if (e.type === "opening") {
      openingTimestamps.add(e.timestamp);
    }
  }

  // No opening entry → no fiscal year boundary in range → no leakage possible
  if (openingTimestamps.size === 0) {
    return { filtered: [...entries], leakedCount: 0, openingExcluded: false };
  }

  // Step 2: Build a map of entryNumber → set of distinct timestamps
  const entryNumberTimestamps = new Map<number, Set<number>>();
  for (const e of entries) {
    let ts = entryNumberTimestamps.get(e.entryNumber);
    if (!ts) {
      ts = new Set();
      entryNumberTimestamps.set(e.entryNumber, ts);
    }
    ts.add(e.timestamp);
  }

  // Step 3: Filter
  let leakedCount = 0;
  let openingExcluded = false;
  const filtered: LedgerEntryLine[] = [];

  for (const e of entries) {
    const atBoundary = openingTimestamps.has(e.timestamp);

    if (!atBoundary) {
      // Not at boundary → always keep
      filtered.push(e);
      continue;
    }

    // At boundary: handle by type
    if (e.type === "opening") {
      if (includeOpening) {
        filtered.push(e);
      } else {
        openingExcluded = true;
      }
      continue;
    }

    if (BOUNDARY_SAFE_TYPES.has(e.type)) {
      // vat_regularization at boundary is legitimate
      filtered.push(e);
      continue;
    }

    // Non-safe type at boundary → check for duplicate entryNumber (primary signal)
    const timestamps = entryNumberTimestamps.get(e.entryNumber)!;
    const hasDuplicate = timestamps.size > 1;

    if (hasDuplicate) {
      // Confirmed leak: same entryNumber exists at a different timestamp
      leakedCount++;
    } else {
      // Fallback: non-safe type at opening timestamp, no duplicate found.
      // Still exclude — legitimate entries at the exact boundary are limited to safe types.
      leakedCount++;
    }
    // Either way, this entry is excluded (not pushed to filtered)
  }

  return { filtered, leakedCount, openingExcluded };
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
function formatAccountBalancesMarkdown(accounts: AccountBalance[]): string {
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
    "holded_accounting_account_balances",
    {
      title: "Holded Accounting Account Balances",
      description: `Compute accurate, date-scoped per-account debit/credit/balance totals.

Unlike list_accounts (which may include entries from outside the requested date range due to a Holded API limitation), this tool aggregates from individual daily ledger entries and filters out cross-fiscal-year leakage.

Use this tool when you need correct account totals for a specific period (P&L, trial balance).

Args:
  - starttmp (number): Period start as Unix timestamp (required)
  - endtmp (number): Period end as Unix timestamp (required)
  - account_filter (number[]): Filter to specific account numbers (optional, returns all if omitted)
  - include_opening (boolean): Include opening balance entry in totals (default: false — set true for balance sheet, false for P&L)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Per-account debit/credit/balance totals, plus metadata about filtered entries.`,
      inputSchema: AccountBalancesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (params) => {
      const { starttmp, endtmp, account_filter, include_opening, response_format } = params as unknown as AccountBalancesInput;

      // 1. Fetch all ledger entries (auto-paginate)
      const { entries, pagesFetched } = await fetchAllLedgerEntries(
        starttmp,
        endtmp,
      );

      // 2. Filter leaked entries
      const { filtered, leakedCount, openingExcluded } = filterLeakedEntries(
        entries,
        include_opening,
      );

      // 3. Aggregate by account
      const totals = aggregateByAccount(filtered);

      // 4. Enrich with account metadata from list_accounts
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

      // 5. Build result
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

      // 6. Apply account filter
      if (account_filter && account_filter.length > 0) {
        const filterSet = new Set(account_filter);
        accounts = accounts.filter((a) => filterSet.has(a.num));
      }

      // Sort by account number
      accounts.sort((a, b) => a.num - b.num);

      const structured = {
        accounts,
        count: accounts.length,
        period: {
          starttmp,
          endtmp,
        },
        filtered_entries: {
          leaked_cross_year: leakedCount,
          opening_balance_excluded: openingExcluded,
        },
        pages_fetched: pagesFetched,
      };

      const textContent =
        response_format === ResponseFormat.MARKDOWN
          ? formatAccountBalancesMarkdown(accounts)
          : JSON.stringify(structured, null, 2);

      return {
        content: [{ type: "text", text: textContent }],
        structuredContent: structured,
      };
    }),
  );
}
