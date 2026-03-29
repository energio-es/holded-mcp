# Fix: Accounting Date Filter Cross-Fiscal-Year Leakage

**Date**: 2026-03-30
**Status**: Draft

## Problem

The Holded API's `list_accounts` endpoint (`/accounting/v1/chartofaccounts`) accepts `starttmp`/`endtmp` parameters, but the returned debit/credit/balance totals are not correctly scoped to the requested date range. Entries belonging to an adjacent fiscal year can leak into the results when their timestamps fall near the fiscal year boundary.

Similarly, `list_daily_ledger` (`/accounting/v1/dailyledger`) returns individual entries that belong to the next fiscal year but have timestamps within the requested range (typically at midnight local time on January 1, which in UTC falls on December 31).

This causes any consumer relying on these endpoints for date-scoped account totals (P&L, trial balance) to get incorrect figures.

### Root Cause

Holded assigns entries to fiscal years independently of their timestamp. However, some entries belonging to fiscal year N+1 are stored with a timestamp at the exact fiscal year boundary — midnight local time on January 1 of year N+1, which in UTC is December 31 of year N (23:00 UTC for CET). Since the `starttmp`/`endtmp` filter operates on timestamps, these entries fall within the year N query range.

### Detection Signal

These leaked entries share two reliable characteristics:

1. **Same timestamp as the opening balance entry**: The fiscal year N+1 opening balance entry (type `"opening"`) has the same boundary timestamp. All leaked entries share this exact timestamp.
2. **Duplicate entry numbers**: Since entry numbers reset per fiscal year, a leaked entry from year N+1 will have an `entryNumber` that also exists in year N's sequence. The same `entryNumber` appearing at two vastly different timestamps confirms cross-year origin.

Both signals together provide reliable detection — the timestamp match identifies candidates, and the duplicate entry number confirms them.

## Solution

### 1. New Composite Tool: `holded_accounting_account_balances`

A new MCP tool that computes accurate, date-scoped per-account debit/credit/balance totals by aggregating from individual daily ledger entries with cross-fiscal-year leak filtering.

#### Input Schema

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `starttmp` | integer | yes | — | Period start as Unix timestamp |
| `endtmp` | integer | yes | — | Period end as Unix timestamp |
| `account_filter` | number[] | no | all | Filter to specific account numbers |
| `include_opening` | boolean | no | false | Include opening balance entry in totals (for balance sheet, not P&L) |
| `response_format` | "json" \| "markdown" | no | "json" | Output format |

Validation: `starttmp` must be less than or equal to `endtmp`. Both must be positive integers.

#### Algorithm

1. **Auto-paginate daily ledger**: Fetch pages sequentially from page 1 until a page returns fewer than 500 entry lines. Collect all entries.
2. **Detect opening entry**: Find entries with `type === "opening"`. Record their timestamp as `opening_ts`.
3. **Identify leak candidates**: Collect all entries where `timestamp === opening_ts` and `type !== "opening"`.
4. **Confirm leaked entries**: For each candidate, check if its `entryNumber` also appears in the result set at a different timestamp. If yes, the candidate is confirmed as a cross-fiscal-year leaked entry. Fallback: if no duplicate `entryNumber` is found (possible when the current fiscal year has very few entries), candidates at `opening_ts` whose type is not `"opening"` or `"vat_regularization"` are still excluded — legitimate entries at the exact fiscal year boundary timestamp are limited to those regulatory types.
5. **Filter**: Remove confirmed and fallback-identified leaked entries. If `include_opening` is false, also remove the opening balance entries.
6. **Aggregate**: Group remaining entries by account number. Sum debits and credits per account. Compute balance as `debit - credit`.
7. **Enrich**: Fetch `list_accounts` (with same `starttmp`/`endtmp`, `include_empty=false`) to get account metadata (name, group). Join by account number.
8. **Apply account filter**: If `account_filter` is provided, return only matching accounts.
9. **Return**: Per-account totals plus metadata listing any filtered leaked entries (for transparency and auditability).

#### Output Structure (JSON)

```json
{
  "accounts": [
    {
      "num": 62900000,
      "name": "Account Name",
      "group": "Compras y gastos",
      "debit": 500.00,
      "credit": 0,
      "balance": 500.00
    }
  ],
  "count": 1,
  "period": {
    "starttmp": "<provided starttmp>",
    "endtmp": "<provided endtmp>"
  },
  "filtered_entries": {
    "leaked_cross_year": 2,
    "opening_balance_excluded": true
  },
  "pages_fetched": 3
}
```

### 2. Documentation Warnings on Existing Tools

#### `holded_accounting_list_accounts`

Add to description:

> **Note**: When using `starttmp`/`endtmp`, the returned debit/credit/balance totals may include entries from outside the requested date range due to a known Holded API limitation. For accurate date-scoped totals, use `holded_accounting_account_balances` instead.

#### `holded_accounting_list_daily_ledger`

Add to description:

> **Note**: The `starttmp` and `endtmp` parameters are required by the API (requests without them are rejected). Results may include entries belonging to adjacent fiscal years whose timestamps fall near the period boundary. Pagination order is non-deterministic.

Also make `starttmp` and `endtmp` required in the input schema (remove `.optional()`).

## File Changes

### New Files

- `src/schemas/accounting/account-balances.ts` — Zod input schema for the new tool
- `src/tools/accounting/account-balances.ts` — Tool implementation (auto-pagination, leak detection, aggregation, registration)
- `tests/account-balances.test.ts` — Unit tests for leak detection and aggregation logic using synthetic data

### Modified Files

- `src/tools/accounting/accounts.ts` — Add warning to `list_accounts` tool description
- `src/tools/accounting/daily-ledger.ts` — Add warning to `list_daily_ledger` tool description
- `src/schemas/accounting/daily-ledger.ts` — Make `starttmp`/`endtmp` required (remove `.optional()`)
- `src/tools/accounting/index.ts` — Import and call `registerAccountBalancesTools`
- `src/types.ts` — Add `AccountBalance` interface if needed

## Edge Cases

- **No opening entry in range**: If the period doesn't span a fiscal year boundary, there's no opening entry and no leakage to filter. The tool simply aggregates all entries as-is.
- **Multiple fiscal year boundaries**: If the date range spans more than one fiscal year (e.g., 2 years), there could be multiple opening entries. The algorithm handles this naturally — each opening entry's timestamp is checked independently.
- **Empty ledger**: If no entries exist for the period, return an empty accounts array.
- **Account in ledger but not in list_accounts**: Use the account number as-is without name/group metadata. This can happen for accounts that the `list_accounts` endpoint omits.
- **Large ledgers**: A year with thousands of entries could require many pages. The sequential pagination approach handles this; the existing rate limiter prevents API throttling.
