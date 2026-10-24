import { WeeklyScheduleEntry } from '../classes/scheduleApi';
import { formatTimeTo12Hour } from '../../lib/time12Format';

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
 * Formats one or more weekly recurring schedule entries into a readable, compact string using 12-hour AM/PM clock.
 * Example: 'Mon, Thu 4:00 PM – 5:00 PM' or 'Mon 4:00 PM – 5:00 PM; Fri 6:00 PM – 7:30 PM'.
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

  // Group by 12-hour time range
  const byTime = new Map<string, string[]>();
  for (const entry of valid) {
    const day = DAY_ABBR[entry.day_of_week.toUpperCase()] || entry.day_of_week;
    const start12 = formatTimeTo12Hour(entry.start_time);
    const end12 = entry.end_time ? formatTimeTo12Hour(entry.end_time) : '';
    const timeKey = end12 ? `${start12} – ${end12}` : start12;

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
