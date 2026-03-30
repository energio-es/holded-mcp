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
