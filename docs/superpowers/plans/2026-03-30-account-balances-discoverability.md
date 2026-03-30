# Account Balances Tool Discoverability Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve discoverability of the account balances tool by removing misleading `starttmp`/`endtmp` params from `list_accounts` and renaming `account_balances` to `list_account_balances`.

**Architecture:** Pure description/schema changes — no logic changes. Remove date params from the accounts schema and tool handler, rename the balances tool registration, and update tests/fixtures accordingly.

**Tech Stack:** TypeScript, Zod, MCP SDK, Vitest

---

### Task 1: Remove `starttmp`/`endtmp` from the accounts schema

**Files:**
- Modify: `src/schemas/accounting/accounts.ts:17-35`

- [ ] **Step 1: Remove `starttmp`, `endtmp` fields and `.refine()` from `ListAccountingAccountsInputSchema`**

Replace the entire schema definition (lines 17–35) with:

```typescript
export const ListAccountingAccountsInputSchema = z.strictObject({
    page: PaginationSchema.shape.page,
    response_format: ResponseFormatSchema,
    include_empty: z.boolean().optional().default(true).describe("Include empty accounts in the results (default: true)"),
  })
```

- [ ] **Step 2: Run tests to verify schema changes compile**

Run: `npx vitest run tests/schema-validation.test.ts`
Expected: Two tests in "Accounting Account List" block will fail — "should validate timestamp range" and "should accept valid timestamp range" — because the schema no longer accepts those fields. The "should accept default include_empty" test should still pass.

- [ ] **Step 3: Commit**

```bash
git add src/schemas/accounting/accounts.ts
git commit -m "refactor: remove starttmp/endtmp from list_accounts schema"
```

---

### Task 2: Remove date params from the accounts tool handler and update description

**Files:**
- Modify: `src/tools/accounting/accounts.ts:76-143`

- [ ] **Step 1: Update the `list` description**

Replace the `list` description string (lines 77–91) with:

```typescript
      list: `List all accounting accounts (chart of accounts/PGC accounts) from Holded.

Returns paginated list of accounting accounts. Use page parameter to navigate through results.

For date-scoped account balances (debit/credit/balance totals for a specific period), use holded_accounting_list_account_balances instead.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')
  - include_empty (boolean): Include empty accounts in the results (default: true)

Returns:
  Array of accounting accounts with id, code, name, type, and parent account information.`,
```

- [ ] **Step 2: Simplify `listQueryParams` to remove date params**

Replace the `listQueryParams` function (lines 137–143) with:

```typescript
    listQueryParams: (params) => {
      const qp: Record<string, unknown> = {};
      if (params.include_empty !== undefined) qp.includeEmpty = params.include_empty ? 1 : 0;
      return qp;
    },
```

- [ ] **Step 3: Build to check for compile errors**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/tools/accounting/accounts.ts
git commit -m "refactor: remove date params from list_accounts tool handler and update description"
```

---

### Task 3: Rename the account balances tool

**Files:**
- Modify: `src/tools/accounting/account-balances.ts:219,222-236`

- [ ] **Step 1: Rename the tool and update its description**

Change the tool registration name on line 219 from:

```typescript
    "holded_accounting_account_balances",
```

to:

```typescript
    "holded_accounting_list_account_balances",
```

Then replace the description string (lines 222–236) with:

```typescript
      description: `Compute accurate, date-scoped per-account debit/credit/balance totals.

Aggregates from individual daily ledger entries and filters out cross-fiscal-year leakage to produce correct period-scoped balances.

Use this tool when you need account totals for a specific period (P&L, trial balance, balance sheet).

Args:
  - starttmp (number): Period start as Unix timestamp (required)
  - endtmp (number): Period end as Unix timestamp (required)
  - account_filter (number[]): Filter to specific account numbers (optional, returns all if omitted)
  - include_opening (boolean): Include opening balance entry in totals (default: false — set true for balance sheet, false for P&L)
  - response_format ('json' | 'markdown'): Output format (default: 'json')

Returns:
  Per-account debit/credit/balance totals, plus metadata about filtered entries.`,
```

- [ ] **Step 2: Build to check for compile errors**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/accounting/account-balances.ts
git commit -m "refactor: rename account_balances to list_account_balances and update description"
```

---

### Task 4: Update test fixtures and schema validation tests

**Files:**
- Modify: `tests/fixtures/accounting.ts:39-47`
- Modify: `tests/schema-validation.test.ts:45,1122-1151`

- [ ] **Step 1: Remove unused fixtures from `tests/fixtures/accounting.ts`**

Delete lines 39–47 (the `validAccountingAccountList` and `invalidAccountingAccountListEndBeforeStart` exports):

```typescript
export const validAccountingAccountList = {
  starttmp: 1730109600,
  endtmp: 1730196000,
};

export const invalidAccountingAccountListEndBeforeStart = {
  starttmp: 1730196000,
  endtmp: 1730109600, // End before start
};
```

- [ ] **Step 2: Remove timestamp tests in `tests/schema-validation.test.ts`**

The import on line 45 stays unchanged (`ListAccountingAccountsInputSchema` is still used by the remaining test).

Replace the "Accounting Account List" describe block (lines 1122–1152) with just the remaining test — removing the two timestamp-related tests:

```typescript
  describe('Accounting Account List', () => {
    it('should accept default include_empty', () => {
      const validData = {};

      const result = ListAccountingAccountsInputSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include_empty).toBe(true);
      }
    });
  });
```

- [ ] **Step 3: Verify the schema now rejects unknown fields like starttmp**

Add a new test after `should accept default include_empty` to confirm the schema rejects date params (since it uses `z.strictObject`):

```typescript
    it('should reject starttmp and endtmp as unknown fields', () => {
      const data = {
        starttmp: 1730109600,
        endtmp: 1730196000,
      };

      const result = ListAccountingAccountsInputSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/accounting.ts tests/schema-validation.test.ts
git commit -m "test: update fixtures and tests for list_accounts schema changes"
```
