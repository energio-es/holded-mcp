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
