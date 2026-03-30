# Account Balances Tool Discoverability Fix

**Date:** 2026-03-30
**Status:** Approved

## Problem

LLM agents use `holded_accounting_list_accounts` with `starttmp`/`endtmp` parameters expecting date-scoped balances, but the Holded API returns all-time totals regardless of date filters. The correct tool (`holded_accounting_account_balances`) exists but agents don't discover it because:

1. `list_accounts` exposes `starttmp`/`endtmp` params with misleading descriptions ("filters by account activity date")
2. The warning about incorrect balances is buried at the end of a long description
3. The `account_balances` tool name doesn't follow the `list_*` convention, making it less likely to be found when an agent searches for "list account balances"

## Solution

### 1. Remove `starttmp`/`endtmp` from `list_accounts`

**Schema (`src/schemas/accounting/accounts.ts`):**
- Remove `starttmp` and `endtmp` fields from `ListAccountingAccountsInputSchema`
- Remove the `.refine()` validation for `starttmp <= endtmp`

**Tool (`src/tools/accounting/accounts.ts`):**
- Remove `starttmp`/`endtmp` from `listQueryParams`
- Remove date parameters from the description's Args section
- Replace the buried "Note" warning with a prominent redirect near the top of the description pointing to the renamed tool

### 2. Rename `account_balances` → `list_account_balances`

**Tool name:** `holded_accounting_account_balances` → `holded_accounting_list_account_balances`

**Files:**
- `src/tools/accounting/account-balances.ts` — tool registration name (line 219)
- `src/tools/accounting/accounts.ts` — cross-reference in description

**Description update:** Remove the "Unlike list_accounts..." contrast (no longer relevant since `list_accounts` won't have date params). Lead with what the tool does.

### 3. Updated `list_accounts` description

```
List all accounting accounts (chart of accounts/PGC accounts) from Holded.

Returns paginated list of accounting accounts. Use page parameter to navigate through results.

For date-scoped account balances (debit/credit/balance totals for a specific period), use holded_accounting_list_account_balances instead.

Args:
  - page (number): Page number for pagination (default: 1, max 500 items per page)
  - response_format ('json' | 'markdown'): Output format (default: 'json')
  - include_empty (boolean): Include empty accounts in the results (default: true)

Returns:
  Array of accounting accounts with id, code, name, type, and parent account information.
```

## Files Changed

| File | Change |
|------|--------|
| `src/schemas/accounting/accounts.ts` | Remove `starttmp`, `endtmp` fields and `.refine()` |
| `src/tools/accounting/accounts.ts` | Remove date params from `listQueryParams` and description; add redirect |
| `src/tools/accounting/account-balances.ts` | Rename tool, update description |
| `tests/fixtures/accounting.ts` | Remove `validAccountingAccountList` and `invalidAccountingAccountListEndBeforeStart` fixtures |
| `tests/schema-validation.test.ts` | Remove "should validate timestamp range" and "should accept valid timestamp range" tests; remove unused fixture imports |

## Out of Scope

- Historical design docs (`docs/superpowers/specs/`, `docs/superpowers/plans/`) referencing the old name are left as-is — they are historical records
- No changes to `account_balances` logic (leak filtering, aggregation) — only name and description
