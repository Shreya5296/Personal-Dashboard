import { WeeklyScheduleEntry } from '../classes/scheduleApi';

const DAY_ABBR: Record<string, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
};

/**
 * Formats one or more weekly recurring schedule entries into a readable, compact string.
 * Example: 'Mon, Thu 16:00–17:00' or 'Mon 16:00–17:00, Fri 18:00–19:00'.
 */
export function formatWeeklySchedule(entries?: WeeklyScheduleEntry[] | null): string {
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return 'No configured schedule';
  }

  // Filter valid entries
  const valid = entries.filter((e) => e && e.day_of_week && e.start_time);
  if (valid.length === 0) {
    return 'No configured schedule';
  }

  // Group by time range: `${start_time}–${end_time}`
  const byTime = new Map<string, string[]>();
  for (const entry of valid) {
    const day = DAY_ABBR[entry.day_of_week.toUpperCase()] || entry.day_of_week;
    const timeKey = entry.end_time ? `${entry.start_time}–${entry.end_time}` : entry.start_time;

    const list = byTime.get(timeKey) || [];
    if (!list.includes(day)) {
      list.push(day);
    }
    byTime.set(timeKey, list);
  }

  const parts: string[] = [];
  byTime.forEach((days, timeRange) => {
    parts.push(`${days.join(', ')} ${timeRange}`);
  });

  return parts.join('; ');
}
