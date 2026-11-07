/**
 * Test Date Helpers
 * Generates deterministic ISO date strings (YYYY-MM-DD) relative to UTC today
 * to prevent test fixture expiration in automated regression suites.
 */

export type WeekdayName =
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY';

const WEEKDAYS: WeekdayName[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

/**
 * Returns the YYYY-MM-DD string for the next occurrence of the specified weekday.
 * Strictly in the future relative to UTC today (at least 1 day ahead, up to offsetWeeks).
 */
export function getNextWeekday(dayName: WeekdayName, offsetWeeks = 1): string {
  const targetDay = WEEKDAYS.indexOf(dayName);
  const now = new Date();
  const currentUtcDay = now.getUTCDay();
  let daysUntil = (targetDay - currentUtcDay + 7) % 7;
  if (daysUntil === 0) daysUntil = 7; // strictly in the future
  daysUntil += (offsetWeeks - 1) * 7;
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntil));
  return target.toISOString().slice(0, 10);
}

/**
 * Returns a future YYYY-MM-DD date string offset by daysAhead days from UTC today.
 */
export function getFutureDate(daysAhead = 7): string {
  const now = new Date();
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysAhead));
  return target.toISOString().slice(0, 10);
}
