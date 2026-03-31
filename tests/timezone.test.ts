/**
 * Tests for CET/CEST timezone conversion utility.
 * All expected values verified against known CET/CEST offsets.
 */

import { describe, it, expect } from 'vitest';
import { dateToMidnightCET, datesToApiRange } from '../src/utils/timezone.js';

describe('dateToMidnightCET', () => {
  it('should convert a winter date to midnight CET (UTC+1)', () => {
    const ts = dateToMidnightCET('2025-01-15');
    expect(ts).toBe(1736895600);
  });

  it('should convert a summer date to midnight CEST (UTC+2)', () => {
    const ts = dateToMidnightCET('2025-07-15');
    expect(ts).toBe(1752530400);
  });

  it('should handle CET to CEST transition day (last Sunday of March)', () => {
    const ts = dateToMidnightCET('2025-03-30');
    expect(ts).toBe(1743289200);
  });

  it('should handle CEST to CET transition day (last Sunday of October)', () => {
    const ts = dateToMidnightCET('2025-10-26');
    expect(ts).toBe(1761429600);
  });

  it('should handle the day after CEST to CET transition', () => {
    const ts = dateToMidnightCET('2025-10-27');
    expect(ts).toBe(1761519600);
  });

  it('should handle Jan 1 2025 (fiscal year start)', () => {
    const ts = dateToMidnightCET('2025-01-01');
    expect(ts).toBe(1735686000);
  });

  it('should handle Jan 1 2026 (next fiscal year start)', () => {
    const ts = dateToMidnightCET('2026-01-01');
    expect(ts).toBe(1767222000);
  });

  it('should accept leap year date Feb 29', () => {
    const ts = dateToMidnightCET('2024-02-29');
    expect(ts).toBe(1709161200);
  });

  it('should throw on invalid date format', () => {
    expect(() => dateToMidnightCET('01/01/2025')).toThrow();
    expect(() => dateToMidnightCET('2025-1-1')).toThrow();
    expect(() => dateToMidnightCET('abc')).toThrow();
    expect(() => dateToMidnightCET('')).toThrow();
  });

  it('should throw on non-existent date', () => {
    expect(() => dateToMidnightCET('2025-02-29')).toThrow();
    expect(() => dateToMidnightCET('2025-04-31')).toThrow();
    expect(() => dateToMidnightCET('2025-13-01')).toThrow();
  });
});

describe('datesToApiRange', () => {
  it('should convert fiscal year 2025 to known CET timestamps', () => {
    const range = datesToApiRange('2025-01-01', '2025-12-31');
    expect(range.starttmp).toBe(1735686000);
    expect(range.endtmp).toBe(1767222000);
  });

  it('should make end_date inclusive by using next day midnight as endtmp', () => {
    const range = datesToApiRange('2025-01-15', '2025-01-15');
    expect(range.starttmp).toBe(1736895600);
    expect(range.endtmp).toBe(1736982000);
  });

  it('should throw when end_date is before start_date', () => {
    expect(() => datesToApiRange('2025-12-31', '2025-01-01')).toThrow();
  });

  it('should throw when date range exceeds 365 days', () => {
    expect(() => datesToApiRange('2024-01-01', '2024-12-31')).toThrow(/365/);
  });

  it('should accept exactly 365-day range for non-leap years', () => {
    const range = datesToApiRange('2025-01-01', '2025-12-31');
    expect(range.endtmp - range.starttmp).toBe(365 * 86400);
  });

  it('should handle range crossing DST transition', () => {
    const range = datesToApiRange('2025-03-01', '2025-04-30');
    expect(range.starttmp).toBeGreaterThan(0);
    expect(range.endtmp).toBeGreaterThan(range.starttmp);
  });
});
