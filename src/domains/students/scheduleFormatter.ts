import { WeeklyScheduleEntry, cleanTime } from '../classes/scheduleApi';
import { formatTimeTo12Hour } from '../../lib/time12Format';

const DAY_ABBR: Record<string, string> = {
  MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed',
  THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
};

const ABBR_TO_DAY: Record<string, string> = {
  MON: 'MONDAY', TUE: 'TUESDAY', WED: 'WEDNESDAY',
  THU: 'THURSDAY', FRI: 'FRIDAY', SAT: 'SATURDAY', SUN: 'SUNDAY',
};

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export function formatCanonicalScheduleString(entries?: WeeklyScheduleEntry[] | null): string {
  if (!entries || !Array.isArray(entries) || entries.length === 0) return '';
  const valid = entries.filter((e) => e && e.day_of_week && e.start_time);
  if (valid.length === 0) return '';

  const sorted = [...valid].sort((a, b) => {
    return DAY_ORDER.indexOf(a.day_of_week.toUpperCase()) - DAY_ORDER.indexOf(b.day_of_week.toUpperCase());
  });

  const parts = sorted.map((e) => {
    const abbr = DAY_ABBR[e.day_of_week.toUpperCase()] || e.day_of_week;
    const t12 = formatTimeTo12Hour(cleanTime(e.start_time));
    return `${abbr} - ${t12}`;
  });

  return parts.join(', ');
}

export function parseCanonicalScheduleString(
  str?: string | null,
  durationMinutes: number = 60
): WeeklyScheduleEntry[] {
  if (!str || typeof str !== 'string') return [];
  const items = str.split(',');
  const results: WeeklyScheduleEntry[] = [];

  for (const raw of items) {
    const item = raw.trim();
    if (!item) continue;
    const dashIdx = item.indexOf('-');
    if (dashIdx === -1) continue;
    const dayPart = item.substring(0, dashIdx).trim().toUpperCase();
    const timePart = item.substring(dashIdx + 1).trim();
    const fullDay = ABBR_TO_DAY[dayPart] || dayPart;
    const start24 = cleanTime(timePart);
    const [sh, sm] = start24.split(':').map(Number);
    const endTotal = (sh * 60 + (sm || 0)) + durationMinutes;
    const endH = Math.floor(endTotal / 60) % 24;
    const endM = endTotal % 60;
    const end24 = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    results.push({
      day_of_week: fullDay,
      start_time: start24,
      end_time: end24,
      is_active: true,
    });
  }
  return results;
}

export function formatWeeklySchedule(entries?: WeeklyScheduleEntry[] | null): string {
  if (!entries || !Array.isArray(entries) || entries.length === 0) return 'No configured schedule';
  const valid = entries.filter((e) => e && e.day_of_week && e.start_time);
  if (valid.length === 0) return 'No configured schedule';

  const byTime = new Map<string, string[]>();
  for (const entry of valid) {
    const day = DAY_ABBR[entry.day_of_week.toUpperCase()] || entry.day_of_week;
    const start12 = formatTimeTo12Hour(entry.start_time);
    const end12 = entry.end_time ? formatTimeTo12Hour(entry.end_time) : '';
    const timeKey = end12 ? `${start12} – ${end12}` : start12;
    const list = byTime.get(timeKey) || [];
    if (!list.includes(day)) list.push(day);
    byTime.set(timeKey, list);
  }

  const parts: string[] = [];
  byTime.forEach((days, timeRange) => parts.push(`${days.join(', ')} ${timeRange}`));
  return parts.join('; ');
}
