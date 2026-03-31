/**
 * CET/CEST timezone conversion utility for Holded API.
 *
 * The Holded API stores accounting entry timestamps at midnight Spanish local
 * time (Europe/Madrid: CET in winter UTC+1, CEST in summer UTC+2). The daily
 * ledger filter uses a half-open interval [starttmp, endtmp).
 *
 * This utility converts YYYY-MM-DD date strings to the correct CET-aligned
 * Unix timestamps for querying the API.
 */

const TIMEZONE = 'Europe/Madrid';
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_SECONDS = 365 * 86400; // API limit: 1 year

/**
 * Convert a YYYY-MM-DD date string to the Unix timestamp of midnight
 * in the Europe/Madrid timezone (CET or CEST depending on date).
 *
 * Uses the Intl API to correctly handle DST transitions.
 */
export function dateToMidnightCET(dateStr: string): number {
  if (!DATE_REGEX.test(dateStr)) {
    throw new Error(`Invalid date format: "${dateStr}". Expected YYYY-MM-DD.`);
  }

  const [year, month, day] = dateStr.split('-').map(Number);

  // Validate the date is real by constructing it and checking components
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date: "${dateStr}" does not exist.`);
  }

  // Start with an initial guess: UTC midnight of the target date
  const utcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0);

  // Get the offset at this approximate time
  const offset = getUtcOffsetMs(utcMidnight);

  // Midnight Madrid = UTC midnight minus offset
  const candidate = utcMidnight - offset;

  // Verify: the offset might differ at the candidate time (DST edge case).
  const offsetAtCandidate = getUtcOffsetMs(candidate);
  const result = utcMidnight - offsetAtCandidate;

  return result / 1000;
}

/**
 * Get the UTC offset in milliseconds for Europe/Madrid at a given UTC instant.
 * Positive means ahead of UTC (e.g., +3600000 for CET).
 */
function getUtcOffsetMs(utcMs: number): number {
  const date = new Date(utcMs);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string): number => {
    const part = parts.find((p) => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };

  const localMs = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );

  return localMs - utcMs;
}

/**
 * Convert an inclusive date range [startDate, endDate] to the half-open
 * timestamp interval [starttmp, endtmp) that the Holded API expects.
 *
 * - starttmp = midnight CET of startDate (inclusive, matches API's >= filter)
 * - endtmp = midnight CET of (endDate + 1 day) (exclusive, matches API's < filter)
 */
export function datesToApiRange(
  startDate: string,
  endDate: string,
): { starttmp: number; endtmp: number } {
  const starttmp = dateToMidnightCET(startDate);

  // Compute endDate + 1 day
  const [ey, em, ed] = endDate.split('-').map(Number);
  const nextDay = new Date(Date.UTC(ey, em - 1, ed + 1, 12, 0, 0));
  const nextDayStr = [
    String(nextDay.getUTCFullYear()).padStart(4, '0'),
    String(nextDay.getUTCMonth() + 1).padStart(2, '0'),
    String(nextDay.getUTCDate()).padStart(2, '0'),
  ].join('-');
  const endtmp = dateToMidnightCET(nextDayStr);

  if (endtmp <= starttmp) {
    throw new Error(
      `end_date must be on or after start_date (got start_date="${startDate}", end_date="${endDate}").`
    );
  }

  const rangeSeconds = endtmp - starttmp;
  if (rangeSeconds > MAX_RANGE_SECONDS) {
    throw new Error(
      `Date range exceeds the Holded API limit of 365 days (got ${Math.ceil(rangeSeconds / 86400)} days). ` +
      `For leap years or ranges over 365 days, split into two queries.`
    );
  }

  return { starttmp, endtmp };
}
