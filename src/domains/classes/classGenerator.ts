import { WeeklyScheduleEntry } from './scheduleApi';
import { ClassSession } from './classTypes';
import { calculateEndTime } from './scheduleDurationCalculator';

export interface ProposedSession {
  dateStr: string;
  dayName: string;
  startTime: string;
  endTime: string;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
  hasConflict: boolean;
  conflictDetails?: string;
  isDuplicate: boolean;
}

const DAY_MAP: Record<string, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

export function localToUtcIso(dateStr: string, timeStr: string, timeZone = 'Asia/Kolkata'): string {
  const tempDate = new Date(`${dateStr}T12:00:00Z`);
  let offset = '+05:30';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, timeZoneName: 'longOffset',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(tempDate);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    if (tzPart && tzPart.value.startsWith('GMT')) {
      offset = tzPart.value.replace('GMT', '');
      if (!offset.includes(':')) offset = `${offset}:00`;
    }
  } catch {}
  const [hStr, mStr] = (timeStr || '00:00').split(':');
  const cleanH = String(parseInt(hStr, 10) || 0).padStart(2, '0');
  const cleanM = String(parseInt(mStr, 10) || 0).padStart(2, '0');
  return new Date(`${dateStr}T${cleanH}:${cleanM}:00${offset}`).toISOString();
}

export function generateProposedSessions(
  schedules: WeeklyScheduleEntry[],
  startDateStr: string,
  count: number,
  existingSessions: ClassSession[] = [],
  studentId?: string,
  durationMinutes?: number,
  timeZone = 'Asia/Kolkata'
): ProposedSession[] {
  if (!schedules.length || !startDateStr || count <= 0) return [];

  const sortedScheds = [...schedules].sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));
  const proposed: ProposedSession[] = [];
  const [startY, startM, startD] = startDateStr.split('-').map((n) => parseInt(n, 10));
  const curr = new Date(startY, startM - 1, startD, 12, 0, 0);

  let iterations = 0;
  const maxDays = 365 * 2;

  while (proposed.length < count && iterations < maxDays) {
    const dayOfWeek = curr.getDay();
    const matching = sortedScheds.filter((s) => DAY_MAP[s.day_of_week.toUpperCase()] === dayOfWeek);

    for (const entry of matching) {
      if (proposed.length >= count) break;

      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      const computedEnd = (durationMinutes && calculateEndTime(entry.start_time, durationMinutes)) || entry.end_time;
      const dur = durationMinutes || Math.max(15, parseTimeToMinutes(computedEnd) - parseTimeToMinutes(entry.start_time));
      const scheduledStart = localToUtcIso(dateStr, entry.start_time, timeZone);
      const scheduledEnd = localToUtcIso(dateStr, computedEnd, timeZone);
      const propStartMs = new Date(scheduledStart).getTime();
      const propEndMs = new Date(scheduledEnd).getTime();

      let hasConflict = false;
      let isDuplicate = false;
      let conflictDetails: string | undefined;

      for (const ex of existingSessions) {
        const exStart = ex.scheduled_start || ex.start_time;
        if (!exStart) continue;
        if (ex.session_status === 'CANCELLED' || ex.status === 'CANCELLED') continue;

        const exStartMs = new Date(exStart).getTime();
        const exDurMs = (ex.duration_minutes || 60) * 60000;
        const exEndMs = ex.scheduled_end ? new Date(ex.scheduled_end).getTime() : exStartMs + exDurMs;

        const isExactTimeMatch = exStartMs === propStartMs || exStart.slice(0, 16) === scheduledStart.slice(0, 16);
        const isLegacyLocalMatch = exStart.slice(0, 10) === dateStr && exStart.slice(11, 16) === entry.start_time;

        if (ex.student_id === studentId && (isExactTimeMatch || isLegacyLocalMatch)) {
          isDuplicate = true;
          hasConflict = true;
          conflictDetails = `Exact duplicate: already scheduled for ${ex.student_name || 'this student'}`;
          break;
        }

        const hasEpochOverlap = propStartMs < exEndMs && propEndMs > exStartMs;
        let hasLegacyOverlap = false;
        if (exStart.slice(0, 10) === dateStr) {
          const exStartMin = parseTimeToMinutes(exStart.slice(11, 16));
          const exEndMin = exStartMin + (ex.duration_minutes || 60);
          const propStartMin = parseTimeToMinutes(entry.start_time);
          const propEndMin = parseTimeToMinutes(computedEnd);
          if (propStartMin < exEndMin && propEndMin > exStartMin) {
            hasLegacyOverlap = true;
          }
        }

        if (hasEpochOverlap || hasLegacyOverlap) {
          hasConflict = true;
          conflictDetails = `Conflict: overlaps with ${ex.student_name || 'student'} (${exStart.slice(11, 16)})`;
        }
      }

      proposed.push({
        dateStr,
        dayName: DAY_NAMES[dayOfWeek],
        startTime: entry.start_time,
        endTime: computedEnd,
        scheduledStart,
        scheduledEnd,
        durationMinutes: dur,
        hasConflict,
        conflictDetails,
        isDuplicate,
      });
    }

    curr.setDate(curr.getDate() + 1);
    iterations++;
  }

  return proposed;
}
