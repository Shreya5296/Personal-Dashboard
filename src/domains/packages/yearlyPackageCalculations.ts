/**
 * Yearly package occurrence calculation and validation rules.
 */

const DAY_MAP: Record<string, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};

export function isYearlyPackage(planType?: string | null): boolean {
  if (!planType) return false;
  const p = String(planType).toLowerCase().trim();
  return p.includes('annual') || p.includes('yearly') || p.includes('early');
}

export interface ScheduleOccurrenceInput {
  day_of_week: string;
  start_time?: string;
  end_time?: string;
}

/**
 * Calculates total scheduled class occurrences within an inclusive date range [startDateStr, endDateStr].
 * Accounts for multiple class entries on the same weekday.
 * Start and end dates are both inclusive.
 */
export function calculateYearlyOccurrencesCount(
  startDateStr?: string | null,
  endDateStr?: string | null,
  schedules?: ScheduleOccurrenceInput[] | null
): number {
  if (!startDateStr || !endDateStr || !schedules || schedules.length === 0) return 0;
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return 0;

  const startUtc = Date.UTC(sy, sm - 1, sd, 12, 0, 0);
  const endUtc = Date.UTC(ey, em - 1, ed, 12, 0, 0);
  if (endUtc < startUtc) return 0;

  let totalCount = 0;
  const curr = new Date(startUtc);
  const maxDays = 365 * 10;
  let safety = 0;

  while (curr.getTime() <= endUtc && safety < maxDays) {
    const dayOfWeek = curr.getUTCDay();
    const matchingEntries = schedules.filter((s) => {
      const d = DAY_MAP[String(s.day_of_week).trim().toUpperCase()];
      return d !== undefined && d === dayOfWeek;
    });
    totalCount += matchingEntries.length;
    curr.setUTCDate(curr.getUTCDate() + 1);
    safety++;
  }

  return totalCount;
}

/**
 * Generates all occurrence dates between inclusive start and end dates.
 */
export function getYearlyOccurrenceDates(
  startDateStr: string,
  endDateStr: string,
  schedules: ScheduleOccurrenceInput[]
): Array<{ date: string; time: string; dayOfWeek: string }> {
  if (!startDateStr || !endDateStr || !schedules || schedules.length === 0) return [];
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return [];

  const startUtc = Date.UTC(sy, sm - 1, sd, 12, 0, 0);
  const endUtc = Date.UTC(ey, em - 1, ed, 12, 0, 0);
  if (endUtc < startUtc) return [];

  const results: Array<{ date: string; time: string; dayOfWeek: string }> = [];
  const curr = new Date(startUtc);
  const maxDays = 365 * 10;
  let safety = 0;

  while (curr.getTime() <= endUtc && safety < maxDays) {
    const dayOfWeek = curr.getUTCDay();
    const matching = schedules.filter((s) => {
      const d = DAY_MAP[String(s.day_of_week).trim().toUpperCase()];
      return d !== undefined && d === dayOfWeek;
    });

    if (matching.length > 0) {
      const y = curr.getUTCFullYear();
      const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
      const d = String(curr.getUTCDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      for (const entry of matching) {
        results.push({
          date: dateStr,
          time: entry.start_time || '18:00',
          dayOfWeek: entry.day_of_week,
        });
      }
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
    safety++;
  }

  return results;
}
