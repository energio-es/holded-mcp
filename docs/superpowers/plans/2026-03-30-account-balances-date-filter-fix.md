# Account Balances Date Filter Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new `holded_accounting_account_balances` MCP tool that computes accurate, date-scoped per-account debit/credit/balance totals by aggregating from individual daily ledger entries with cross-fiscal-year leak filtering. Also add documentation warnings to existing accounting tools.

**Architecture:** A new composite tool auto-paginates the daily ledger, detects and filters cross-fiscal-year leaked entries using the opening-balance timestamp + duplicate entry number signals, aggregates debit/credit per account, and enriches results with account metadata from `list_accounts`. Two pure functions (leak filtering + aggregation) are exported for direct unit testing with synthetic data. Existing tools get description warnings about the API limitation.

**Tech Stack:** TypeScript, Zod v4, MCP SDK, Jest (ESM mode via ts-jest)

---

### Task 1: Add new types to `src/types.ts`

**Files:**
- Modify: `src/types.ts:617` (after `DailyLedgerEntry` and before `CreateEntryResponse`)

- [ ] **Step 1: Add `LedgerEntryLine` and `AccountBalance` interfaces**

Add these two interfaces after the existing `DailyLedgerEntry` interface (after line 617):

```typescript
/**
 * What the daily ledger API actually returns per entry line.
 * Unlike DailyLedgerEntry (which was typed from docs), this matches the real API response.
 */
export interface LedgerEntryLine {
  entryNumber: number;
  line: number;
  timestamp: number;
  type: string;
  description: string;
  docDescription: string;
  account: number;
  debit: number;
  credit: number;
  tags: string[];
  checked: string;
}

/**
 * Aggregated account balance computed from ledger entries.
 * Output of holded_accounting_account_balances tool.
 */
export interface AccountBalance {
  num: number;
  name: string;
  group: string;
  debit: number;
  credit: number;
  balance: number;
}
```

- [ ] **Step 2: Verify the project compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add LedgerEntryLine and AccountBalance types for account balances tool"
```

---

### Task 2: Create input schema for account-balances tool

**Files:**
- Create: `src/schemas/accounting/account-balances.ts`
- Modify: `tests/schema-validation.test.ts` (add test block at end of accounting section, around line 1091)
- Modify: `tests/fixtures/accounting.ts` (add fixture data at end)

- [ ] **Step 1: Write the schema validation tests**

Add these fixtures to the end of `tests/fixtures/accounting.ts`:

```typescript
export const validAccountBalances = {
  starttmp: 1730109600,
  endtmp: 1730196000,
};

export const accountBalancesWithFilter = {
  starttmp: 1730109600,
  endtmp: 1730196000,
  account_filter: [62900001, 62900002],
  include_opening: true,
};

export const invalidAccountBalancesEndBeforeStart = {
  starttmp: 1730196000,
  endtmp: 1730109600,
};

export const invalidAccountBalancesMissingStart = {
  endtmp: 1730196000,
};

export const invalidAccountBalancesMissingEnd = {
  starttmp: 1730109600,
};
```

Add this test block in `tests/schema-validation.test.ts` after the "Accounting Account List" describe block (after line 1091), inside the existing accounting describe block. Add the import at the top of the file alongside the existing accounting fixture imports:

```typescript
// Add to imports:
import {
  AccountBalancesInputSchema,
} from '../src/schemas/accounting/account-balances.js';
import {
  validAccountBalances,
  accountBalancesWithFilter,
  invalidAccountBalancesEndBeforeStart,
  invalidAccountBalancesMissingStart,
  invalidAccountBalancesMissingEnd,
} from './fixtures/accounting.js';

// Add test block:
  describe('Account Balances', () => {
    it('should accept valid starttmp and endtmp', () => {
      const result = AccountBalancesInputSchema.safeParse(validAccountBalances);
      expect(result.success).toBe(true);
    });

    it('should accept optional account_filter and include_opening', () => {
      const result = AccountBalancesInputSchema.safeParse(accountBalancesWithFilter);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.account_filter).toEqual([62900001, 62900002]);
        expect(result.data.include_opening).toBe(true);
      }
    });

    it('should reject when endtmp is before starttmp', () => {
      const result = AccountBalancesInputSchema.safeParse(invalidAccountBalancesEndBeforeStart);
      expect(result.success).toBe(false);
    });

    it('should require starttmp', () => {
      const result = AccountBalancesInputSchema.safeParse(invalidAccountBalancesMissingStart);
      expect(result.success).toBe(false);
    });

    it('should require endtmp', () => {
      const result = AccountBalancesInputSchema.safeParse(invalidAccountBalancesMissingEnd);
      expect(result.success).toBe(false);
    });

    it('should default include_opening to false', () => {
      const result = AccountBalancesInputSchema.safeParse(validAccountBalances);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include_opening).toBe(false);
      }
    });

    it('should default response_format to json', () => {
      const result = AccountBalancesInputSchema.safeParse(validAccountBalances);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.response_format).toBe('json');
      }
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --config jest.config.js tests/schema-validation.test.ts -t "Account Balances" --no-coverage 2>&1 | tail -5`
Expected: FAIL — module `../src/schemas/accounting/account-balances.js` not found.

- [ ] **Step 3: Create the schema file**

Create `src/schemas/accounting/account-balances.ts`:

```typescript
/**
 * Zod schemas for Account Balances tool
 */

import { z } from "zod";
import { ResponseFormatSchema } from "../common.js";

/**
 * Account Balances input schema
 *
 * Both starttmp and endtmp are required — the tool aggregates ledger entries
 * within this date range and filters out cross-fiscal-year leakage.
 */
export const AccountBalancesInputSchema = z.strictObject({
  starttmp: z.number().int().positive().describe("Period start as Unix timestamp (required)"),
  endtmp: z.number().int().positive().describe("Period end as Unix timestamp (required)"),
  account_filter: z
    .array(z.number().int().positive())
    .optional()
    .describe("Filter to specific account numbers (returns all accounts if omitted)"),
  include_opening: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include opening balance entry in totals (default: false, set true for balance sheet)"),
  response_format: ResponseFormatSchema,
}).refine(
  (data) => data.starttmp <= data.endtmp,
  {
    message: "starttmp must be less than or equal to endtmp (start date cannot be after end date)",
  }
);

export type AccountBalancesInput = z.infer<typeof AccountBalancesInputSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --config jest.config.js tests/schema-validation.test.ts -t "Account Balances" --no-coverage 2>&1 | tail -5`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schemas/accounting/account-balances.ts tests/schema-validation.test.ts tests/fixtures/accounting.ts
git commit -m "feat: add AccountBalancesInputSchema with validation tests"
```

---

### Task 3: Implement leak detection pure function with tests

**Files:**
- Create: `src/tools/accounting/account-balances.ts` (initial version with just the pure function)
- Create: `tests/account-balances.test.ts`

- [ ] **Step 1: Write the leak detection tests**

Create `tests/account-balances.test.ts`:

```typescript
/**
 * Tests for account balances leak detection and aggregation logic.
 * Uses synthetic data only — no real account numbers or amounts.
 */

import { describe, it, expect } from '@jest/globals';
import { filterLeakedEntries } from '../src/tools/accounting/account-balances.js';
import type { LedgerEntryLine } from '../src/types.js';

/** Helper to build a synthetic ledger entry line */
function entry(overrides: Partial<LedgerEntryLine> & Pick<LedgerEntryLine, 'entryNumber' | 'timestamp' | 'account' | 'debit' | 'credit'>): LedgerEntryLine {
  return {
    line: 1,
    type: 'purchase',
    description: '',
    docDescription: '',
    tags: [],
    checked: 'No',
    ...overrides,
  };
}

describe('filterLeakedEntries', () => {
  it('should pass through all entries when there is no opening entry', () => {
    const entries: LedgerEntryLine[] = [
      entry({ entryNumber: 1, timestamp: 1000000, account: 6290, debit: 100, credit: 0 }),
      entry({ entryNumber: 2, timestamp: 1000100, account: 6290, debit: 200, credit: 0 }),
    ];

    const result = filterLeakedEntries(entries, false);

    expect(result.filtered).toHaveLength(2);
    expect(result.leakedCount).toBe(0);
    expect(result.openingExcluded).toBe(false);
  });

  it('should exclude leaked entries confirmed by duplicate entryNumber', () => {
    const OPENING_TS = 2000000;

    const entries: LedgerEntryLine[] = [
      // Fiscal year N: entry #3 from May
      entry({ entryNumber: 3, line: 1, timestamp: 1500000, account: 1940, debit: 3000, credit: 0 }),
      entry({ entryNumber: 3, line: 2, timestamp: 1500000, account: 1000, debit: 0, credit: 3000 }),
      // Fiscal year N: regular purchase
      entry({ entryNumber: 10, timestamp: 1600000, account: 6290, debit: 50, credit: 0 }),
      // Opening balance for N+1
      entry({ entryNumber: 47, line: 1, timestamp: OPENING_TS, account: 1290, debit: 0, credit: 500, type: 'opening' }),
      // Leaked from N+1: entry #3 at opening timestamp (duplicate entryNumber!)
      entry({ entryNumber: 3, line: 1, timestamp: OPENING_TS, account: 4100, debit: 0, credit: 80 }),
      entry({ entryNumber: 3, line: 2, timestamp: OPENING_TS, account: 6290, debit: 67, credit: 0 }),
    ];

    const result = filterLeakedEntries(entries, false);

    // Should keep: year N entry #3 (2 lines), entry #10 (1 line) = 3 lines
    // Should exclude: opening (1 line) + leaked entry #3 (2 lines)
    expect(result.filtered).toHaveLength(3);
    expect(result.leakedCount).toBe(2);
    expect(result.openingExcluded).toBe(true);
  });

  it('should include opening entries when include_opening is true', () => {
    const OPENING_TS = 2000000;

    const entries: LedgerEntryLine[] = [
      entry({ entryNumber: 1, timestamp: 1500000, account: 6290, debit: 100, credit: 0 }),
      entry({ entryNumber: 47, line: 1, timestamp: OPENING_TS, account: 1000, debit: 0, credit: 3000, type: 'opening' }),
      entry({ entryNumber: 47, line: 2, timestamp: OPENING_TS, account: 5720, debit: 3000, credit: 0, type: 'opening' }),
    ];

    const result = filterLeakedEntries(entries, true);

    // All 3 lines should be kept (opening included, no leakage)
    expect(result.filtered).toHaveLength(3);
    expect(result.leakedCount).toBe(0);
    expect(result.openingExcluded).toBe(false);
  });

  it('should use fallback detection when leaked entry has no duplicate entryNumber', () => {
    const OPENING_TS = 2000000;

    const entries: LedgerEntryLine[] = [
      // Only 2 entries in fiscal year N (entry #1 and #2)
      entry({ entryNumber: 1, timestamp: 1500000, account: 6290, debit: 100, credit: 0, type: 'entry' }),
      entry({ entryNumber: 2, timestamp: 1500100, account: 6290, debit: 200, credit: 0, type: 'entry' }),
      // Opening balance for N+1
      entry({ entryNumber: 47, timestamp: OPENING_TS, account: 1000, debit: 0, credit: 300, type: 'opening' }),
      // Leaked from N+1: entry #5 at opening timestamp — no duplicate since N only has #1 and #2
      entry({ entryNumber: 5, timestamp: OPENING_TS, account: 6290, debit: 45, credit: 0, type: 'purchase' }),
    ];

    const result = filterLeakedEntries(entries, false);

    // Should keep: entries #1 and #2
    // Should exclude: opening + leaked #5 (fallback: purchase type at opening_ts)
    expect(result.filtered).toHaveLength(2);
    expect(result.leakedCount).toBe(1);
    expect(result.openingExcluded).toBe(true);
  });

  it('should keep vat_regularization entries at opening timestamp', () => {
    const OPENING_TS = 2000000;

    const entries: LedgerEntryLine[] = [
      entry({ entryNumber: 1, timestamp: 1500000, account: 6290, debit: 100, credit: 0 }),
      // VAT regularization right at the boundary — this is legitimate
      entry({ entryNumber: 200, timestamp: OPENING_TS, account: 4720, debit: 0, credit: 500, type: 'vat_regularization' }),
      // Opening
      entry({ entryNumber: 47, timestamp: OPENING_TS, account: 1000, debit: 0, credit: 300, type: 'opening' }),
    ];

    const result = filterLeakedEntries(entries, false);

    // Should keep: entry #1 + vat_regularization #200
    // Should exclude: opening
    expect(result.filtered).toHaveLength(2);
    expect(result.leakedCount).toBe(0);
    expect(result.openingExcluded).toBe(true);
  });

  it('should handle empty entries array', () => {
    const result = filterLeakedEntries([], false);

    expect(result.filtered).toHaveLength(0);
    expect(result.leakedCount).toBe(0);
    expect(result.openingExcluded).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --config jest.config.js tests/account-balances.test.ts -t "filterLeakedEntries" --no-coverage 2>&1 | tail -5`
Expected: FAIL — module `../src/tools/accounting/account-balances.js` not found.

- [ ] **Step 3: Implement filterLeakedEntries**

Create `src/tools/accounting/account-balances.ts`:

```typescript
/**
 * Account Balances tool for Holded API
 *
 * Computes accurate, date-scoped per-account debit/credit/balance totals
 * by aggregating from individual daily ledger entries with cross-fiscal-year
 * leak filtering.
 */

import type { LedgerEntryLine } from "../../types.js";

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --config jest.config.js tests/account-balances.test.ts -t "filterLeakedEntries" --no-coverage 2>&1 | tail -5`
Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/accounting/account-balances.ts tests/account-balances.test.ts
git commit -m "feat: add filterLeakedEntries with cross-fiscal-year leak detection"
```

---

### Task 4: Implement aggregation pure function with tests

**Files:**
- Modify: `src/tools/accounting/account-balances.ts` (add function)
- Modify: `tests/account-balances.test.ts` (add test block)

- [ ] **Step 1: Write the aggregation tests**

Add to `tests/account-balances.test.ts` (import `aggregateByAccount` alongside `filterLeakedEntries`, reuse the `entry` helper):

```typescript
// Update import line:
import { filterLeakedEntries, aggregateByAccount } from '../src/tools/accounting/account-balances.js';

// Add new describe block after filterLeakedEntries tests:
describe('aggregateByAccount', () => {
  it('should sum debits and credits per account', () => {
    const entries: LedgerEntryLine[] = [
      entry({ entryNumber: 1, timestamp: 1000000, account: 6290, debit: 100, credit: 0 }),
      entry({ entryNumber: 2, timestamp: 1000100, account: 6290, debit: 50, credit: 0 }),
      entry({ entryNumber: 3, timestamp: 1000200, account: 7050, debit: 0, credit: 200 }),
    ];

    const result = aggregateByAccount(entries);

    expect(result.get(6290)).toEqual({ debit: 150, credit: 0 });
    expect(result.get(7050)).toEqual({ debit: 0, credit: 200 });
    expect(result.size).toBe(2);
  });

  it('should handle entries with both debit and credit across lines', () => {
    const entries: LedgerEntryLine[] = [
      entry({ entryNumber: 1, timestamp: 1000000, account: 4100, debit: 0, credit: 121 }),
      entry({ entryNumber: 2, timestamp: 1000100, account: 4100, debit: 121, credit: 0 }),
    ];

    const result = aggregateByAccount(entries);

    expect(result.get(4100)).toEqual({ debit: 121, credit: 121 });
  });

  it('should return empty map for empty entries', () => {
    const result = aggregateByAccount([]);

    expect(result.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest --config jest.config.js tests/account-balances.test.ts -t "aggregateByAccount" --no-coverage 2>&1 | tail -5`
Expected: FAIL — `aggregateByAccount` is not exported.

- [ ] **Step 3: Implement aggregateByAccount**

Add to `src/tools/accounting/account-balances.ts` after `filterLeakedEntries`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --config jest.config.js tests/account-balances.test.ts -t "aggregateByAccount" --no-coverage 2>&1 | tail -5`
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/accounting/account-balances.ts tests/account-balances.test.ts
git commit -m "feat: add aggregateByAccount for per-account debit/credit totals"
```

---

### Task 5: Implement the composite tool (auto-pagination, enrichment, registration)

**Files:**
- Modify: `src/tools/accounting/account-balances.ts` (add tool registration function)

- [ ] **Step 1: Add imports and the auto-pagination helper**

Add these imports at the top of `src/tools/accounting/account-balances.ts`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeApiRequest, handleApiError } from "../../services/api.js";
import { ResponseFormat } from "../../constants.js";
import type { LedgerEntryLine, AccountBalance } from "../../types.js";
import {
  AccountBalancesInputSchema,
  AccountBalancesInput,
} from "../../schemas/accounting/account-balances.js";
```

Remove the existing standalone `import type { LedgerEntryLine } from "../../types.js";` line that was added in Task 3, since it's now covered by the combined import above.

Add the pagination constant and helper after the imports, before `filterLeakedEntries`:

```typescript
/** Maximum entry lines per page returned by the daily ledger API */
const LEDGER_PAGE_SIZE = 500;

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
```

- [ ] **Step 2: Add the markdown formatter and tool registration function**

Add at the end of `src/tools/accounting/account-balances.ts`:

```typescript
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
    async (params: AccountBalancesInput) => {
      try {
        // 1. Fetch all ledger entries (auto-paginate)
        const { entries, pagesFetched } = await fetchAllLedgerEntries(
          params.starttmp,
          params.endtmp,
        );

        // 2. Filter leaked entries
        const { filtered, leakedCount, openingExcluded } = filterLeakedEntries(
          entries,
          params.include_opening,
        );

        // 3. Aggregate by account
        const totals = aggregateByAccount(filtered);

        // 4. Enrich with account metadata from list_accounts
        const accountMeta = await makeApiRequest<AccountMetadata[]>(
          "accounting",
          "chartofaccounts",
          "GET",
          undefined,
          { starttmp: params.starttmp, endtmp: params.endtmp, includeEmpty: 0 },
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
        if (params.account_filter && params.account_filter.length > 0) {
          const filterSet = new Set(params.account_filter);
          accounts = accounts.filter((a) => filterSet.has(a.num));
        }

        // Sort by account number
        accounts.sort((a, b) => a.num - b.num);

        const structured = {
          accounts,
          count: accounts.length,
          period: {
            starttmp: params.starttmp,
            endtmp: params.endtmp,
          },
          filtered_entries: {
            leaked_cross_year: leakedCount,
            opening_balance_excluded: openingExcluded,
          },
          pages_fetched: pagesFetched,
        };

        const textContent =
          params.response_format === ResponseFormat.MARKDOWN
            ? formatAccountBalancesMarkdown(accounts)
            : JSON.stringify(structured, null, 2);

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: structured,
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true,
        };
      }
    },
  );
}
```

- [ ] **Step 3: Verify the project compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/tools/accounting/account-balances.ts
git commit -m "feat: add holded_accounting_account_balances composite tool"
```

---

### Task 6: Wire the new tool into the accounting module

**Files:**
- Modify: `src/tools/accounting/index.ts`

- [ ] **Step 1: Add import and registration call**

In `src/tools/accounting/index.ts`, add the import and registration:

```typescript
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
```

- [ ] **Step 2: Verify the project compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Run full test suite**

Run: `npx jest --config jest.config.js --no-coverage 2>&1 | tail -10`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/tools/accounting/index.ts
git commit -m "feat: register account balances tool in accounting module"
```

---

### Task 7: Add documentation warnings to existing tools and fix daily ledger schema

**Files:**
- Modify: `src/tools/accounting/accounts.ts:65-77` (description string)
- Modify: `src/tools/accounting/daily-ledger.ts:25-34` (description string)
- Modify: `src/schemas/accounting/daily-ledger.ts:17-19` (remove `.optional()`)
- Modify: `tests/schema-validation.test.ts` (update daily ledger tests if needed)

- [ ] **Step 1: Add warning to list_accounts tool description**

In `src/tools/accounting/accounts.ts`, replace the `description` string of `holded_accounting_list_accounts` (lines 65-77):

```typescript
      description: `List all accounting accounts (chart of accounts/PGC accounts) from Holded.

Returns paginated list of accounting accounts. Use page parameter to navigate through results.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')
  - include_empty (boolean): Include empty accounts in the results (default: true)
  - starttmp (number): Starting timestamp as Unix timestamp (optional, filters by account activity date)
  - endtmp (number): Ending timestamp as Unix timestamp (optional, filters by account activity date)

Note: When using starttmp/endtmp, the returned debit/credit/balance totals may include entries from outside the requested date range due to a known Holded API limitation. For accurate date-scoped totals, use holded_accounting_account_balances instead.

Returns:
  Array of accounting accounts with id, code, name, type, and parent account information.`,
```

- [ ] **Step 2: Add warning to list_daily_ledger tool description**

In `src/tools/accounting/daily-ledger.ts`, replace the `description` string of `holded_accounting_list_daily_ledger` (lines 25-34):

```typescript
      description: `List daily ledger entries from Holded Accounting.

Args:
  - starttmp (number): Starting timestamp as Unix timestamp (required, filters entries from this date)
  - endtmp (number): Ending timestamp as Unix timestamp (required, filters entries until this date)
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Note: The starttmp and endtmp parameters are required by the API. Results may include entries belonging to adjacent fiscal years whose timestamps fall near the period boundary. Pagination order is non-deterministic.

Returns:
  Array of daily ledger entries with date, account, amount, and description.`,
```

- [ ] **Step 3: Make starttmp and endtmp required in the daily ledger schema**

In `src/schemas/accounting/daily-ledger.ts`, change lines 18-19 to remove `.optional()`:

```typescript
    starttmp: z.number().int().positive().describe("Starting timestamp as Unix timestamp (required, filters entries from this date)"),
    endtmp: z.number().int().positive().describe("Ending timestamp as Unix timestamp (required, filters entries until this date)"),
```

Also update the `.refine()` — since both are now always present, simplify:

```typescript
  }).refine(
    (data) => data.starttmp <= data.endtmp,
    {
      message: "starttmp must be less than or equal to endtmp (start date cannot be after end date)",
    }
  )
```

And update the `ListDailyLedgerInput` handler in `src/tools/accounting/daily-ledger.ts` — remove the `undefined` checks on lines 46-51 since the params are now required:

```typescript
        const queryParams: Record<string, unknown> = {
          starttmp: params.starttmp,
          endtmp: params.endtmp,
        };
        if (params.page > 1) {
          queryParams.page = params.page;
        }
```

Also update the comment at the top of the schema file (lines 11-13) to reflect reality:

```typescript
/**
 * List daily ledger entries input schema
 *
 * The API requires starttmp and endtmp (requests without them are rejected).
 */
```

- [ ] **Step 4: Run the full test suite**

Run: `npx jest --config jest.config.js --no-coverage 2>&1 | tail -15`
Expected: All tests pass. The existing daily ledger schema tests should still pass since they provide both timestamps. If any test passes only `endtmp` or only `starttmp` without the other, it will now fail and needs updating.

- [ ] **Step 5: Verify the project compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/tools/accounting/accounts.ts src/tools/accounting/daily-ledger.ts src/schemas/accounting/daily-ledger.ts
git commit -m "fix: add API limitation warnings and make daily ledger date params required"
```

---

### Task 8: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite with coverage**

Run: `npx jest --config jest.config.js --coverage 2>&1 | tail -20`
Expected: All tests pass. Coverage meets thresholds (70% branches/functions/lines/statements).

- [ ] **Step 2: Build the project**

Run: `npm run build`
Expected: Clean build, no errors.

- [ ] **Step 3: Verify all new files exist**

Run: `ls -la src/schemas/accounting/account-balances.ts src/tools/accounting/account-balances.ts tests/account-balances.test.ts`
Expected: All three files exist.

- [ ] **Step 4: Commit any remaining changes (if any)**

If there are unstaged changes:
```bash
git add -A && git commit -m "chore: final cleanup for account balances tool"
```
