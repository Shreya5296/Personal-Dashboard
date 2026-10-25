import { describe, it, expect } from 'vitest';
import {
  parseYearMonth,
  shiftDateStr,
  shiftMonthStr,
  formatMonthTitle,
  formatDayTitle,
  getMonthGridDates,
} from '../../src/domains/calendar/calendarDateUtils';

describe('Fix 4 — Calendar Views & Navigation', () => {
  it('parses year and month from YYYY-MM accurately', () => {
    expect(parseYearMonth('2026-10')).toEqual({ year: 2026, month: 10 });
    expect(parseYearMonth('2025-01')).toEqual({ year: 2025, month: 1 });
  });

  it('shifts day dates forwards and backwards across month and year boundaries', () => {
    expect(shiftDateStr('2026-10-26', 1)).toBe('2026-10-27');
    expect(shiftDateStr('2026-10-26', -1)).toBe('2026-10-25');
    // Month boundary
    expect(shiftDateStr('2026-10-31', 1)).toBe('2026-11-01');
    expect(shiftDateStr('2026-11-01', -1)).toBe('2026-10-31');
    // Year boundary
    expect(shiftDateStr('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDateStr('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('shifts month strings correctly across year boundaries', () => {
    expect(shiftMonthStr('2026-10', 1)).toBe('2026-11');
    expect(shiftMonthStr('2026-10', -1)).toBe('2026-09');
    expect(shiftMonthStr('2026-12', 1)).toBe('2027-01');
    expect(shiftMonthStr('2027-01', -1)).toBe('2026-12');
  });

  it('formats human readable titles for month and day views', () => {
    expect(formatMonthTitle('2026-10')).toBe('October 2026');
    const dayTitle = formatDayTitle('2026-10-26');
    expect(dayTitle).toContain('Monday');
    expect(dayTitle).toContain('26');
    expect(dayTitle).toContain('October');
    expect(dayTitle).toContain('2026');
  });

  it('generates Monday-to-Sunday month grids of 35 or 42 days', () => {
    // October 2026: Oct 1 is Thursday. Start Monday is Sep 28.
    // Last day is Oct 31 (Saturday). Total days fits in 35 days (Sep 28 to Nov 1).
    const oct2026Grid = getMonthGridDates(2026, 10);
    expect(oct2026Grid).toHaveLength(35);
    expect(oct2026Grid[0]).toBe('2026-09-28'); // Monday
    expect(oct2026Grid[oct2026Grid.length - 1]).toBe('2026-11-01'); // Sunday

    // August 2026: Aug 1 is Saturday. Ends Aug 31 (Monday). Needs 42 days.
    const aug2026Grid = getMonthGridDates(2026, 8);
    expect(aug2026Grid).toHaveLength(42);
    expect(aug2026Grid[0]).toBe('2026-07-27'); // Monday
    expect(aug2026Grid[aug2026Grid.length - 1]).toBe('2026-09-06'); // Sunday
  });
});
