/**
 * Date calculations and grid utilities for Day, Week, and Month calendar views.
 */

export function parseYearMonth(yearMonthStr: string): { year: number; month: number } {
  const parts = yearMonthStr.split('-').map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = parts[1] || new Date().getMonth() + 1;
  return { year, month };
}

export function shiftDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return dt.toISOString().slice(0, 10);
}

export function shiftMonthStr(yearMonthStr: string, deltaMonths: number): string {
  const { year, month } = parseYearMonth(yearMonthStr);
  const dt = new Date(Date.UTC(year, month - 1 + deltaMonths, 1, 12, 0, 0));
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatMonthTitle(yearMonthStr: string): string {
  const { year, month } = parseYearMonth(yearMonthStr);
  const dt = new Date(Date.UTC(year, month - 1, 15, 12, 0, 0));
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(dt);
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatWeekRangeTitle(startDateStr: string, endDateStr: string): string {
  const [y1, m1, d1] = startDateStr.split('-').map(Number);
  const [y2, m2, d2] = endDateStr.split('-').map(Number);
  const d1Str = String(d1).padStart(2, '0');
  const d2Str = String(d2).padStart(2, '0');
  const mo1 = MONTHS_SHORT[m1 - 1] || '';
  const mo2 = MONTHS_SHORT[m2 - 1] || '';

  if (y1 === y2 && m1 === m2) {
    return `${d1Str} – ${d2Str} ${mo1} ${y1}`;
  }
  if (y1 === y2) {
    return `${d1Str} ${mo1} – ${d2Str} ${mo2} ${y1}`;
  }
  return `${d1Str} ${mo1} ${y1} – ${d2Str} ${mo2} ${y2}`;
}

export function formatDayTitle(dateStr: string, timeZone = 'UTC'): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone,
    }).format(dt);
  } catch {
    return dateStr;
  }
}

export function getMonthGridDates(year: number, month: number): string[] {
  const firstDay = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  const startDayOfWeek = (firstDay.getUTCDay() + 6) % 7;
  const startDate = new Date(firstDay);
  startDate.setUTCDate(startDate.getUTCDate() - startDayOfWeek);

  const dates: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setUTCDate(startDate.getUTCDate() + i);
    const yr = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    const da = String(d.getUTCDate()).padStart(2, '0');
    dates.push(`${yr}-${mo}-${da}`);
  }

  const lastDateOfCurrentMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastMonthDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDateOfCurrentMonth).padStart(2, '0')}`;
  const idxOfLast = dates.indexOf(lastMonthDateStr);
  if (idxOfLast < 35) return dates.slice(0, 35);
  return dates;
}
