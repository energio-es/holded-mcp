/**
 * Tests for account balances aggregation logic.
 * Uses synthetic data only — no real account numbers or amounts.
 */

import { describe, it, expect } from 'vitest';
import { aggregateByAccount, filterOpeningEntries } from '../src/tools/accounting/account-balances.js';
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

describe('filterOpeningEntries', () => {
  it('should remove opening entries when includeOpening is false', () => {
    const entries: LedgerEntryLine[] = [
      entry({ entryNumber: 1, timestamp: 1000000, account: 6290, debit: 100, credit: 0, type: 'purchase' }),
      entry({ entryNumber: 47, timestamp: 2000000, account: 1000, debit: 0, credit: 3000, type: 'opening' }),
      entry({ entryNumber: 47, timestamp: 2000000, account: 5720, debit: 3000, credit: 0, type: 'opening' }),
    ];

    const result = filterOpeningEntries(entries, false);

    expect(result.filtered).toHaveLength(1);
    expect(result.filtered[0].entryNumber).toBe(1);
    expect(result.openingExcluded).toBe(true);
  });

  it('should keep opening entries when includeOpening is true', () => {
    const entries: LedgerEntryLine[] = [
      entry({ entryNumber: 1, timestamp: 1000000, account: 6290, debit: 100, credit: 0, type: 'purchase' }),
      entry({ entryNumber: 47, timestamp: 2000000, account: 1000, debit: 0, credit: 3000, type: 'opening' }),
    ];

    const result = filterOpeningEntries(entries, true);

    expect(result.filtered).toHaveLength(2);
    expect(result.openingExcluded).toBe(false);
  });

  it('should handle entries with no opening type', () => {
    const entries: LedgerEntryLine[] = [
      entry({ entryNumber: 1, timestamp: 1000000, account: 6290, debit: 100, credit: 0, type: 'purchase' }),
      entry({ entryNumber: 2, timestamp: 1000100, account: 6290, debit: 200, credit: 0, type: 'entry' }),
    ];

    const result = filterOpeningEntries(entries, false);

    expect(result.filtered).toHaveLength(2);
    expect(result.openingExcluded).toBe(false);
  });

  it('should handle empty entries', () => {
    const result = filterOpeningEntries([], false);

    expect(result.filtered).toHaveLength(0);
    expect(result.openingExcluded).toBe(false);
  });
});

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
