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

export function generateProposedSessions(
  schedules: WeeklyScheduleEntry[],
  startDateStr: string,
  count: number,
  existingSessions: ClassSession[] = [],
  studentId?: string,
  durationMinutes?: number
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
      const scheduledStart = `${dateStr}T${entry.start_time}:00.000Z`;
      const scheduledEnd = `${dateStr}T${computedEnd}:00.000Z`;

      let hasConflict = false;
      let isDuplicate = false;
      let conflictDetails: string | undefined;

      for (const ex of existingSessions) {
        const exStart = ex.scheduled_start || ex.start_time;
        if (!exStart) continue;
        if (ex.session_status === 'CANCELLED' || ex.status === 'CANCELLED') continue;

        if (ex.student_id === studentId && exStart.slice(0, 16) === scheduledStart.slice(0, 16)) {
          isDuplicate = true;
          hasConflict = true;
          conflictDetails = `Exact duplicate: already scheduled for ${ex.student_name || 'this student'}`;
          break;
        }

        if (exStart.slice(0, 10) === dateStr) {
          const exStartMin = parseTimeToMinutes(exStart.slice(11, 16));
          const exDur = ex.duration_minutes || 60;
          const exEndMin = exStartMin + exDur;
          const propStartMin = parseTimeToMinutes(entry.start_time);
          const propEndMin = parseTimeToMinutes(computedEnd);

          if (propStartMin < exEndMin && propEndMin > exStartMin) {
            hasConflict = true;
            conflictDetails = `Conflict: overlaps with ${ex.student_name || 'student'} (${exStart.slice(11, 16)})`;
          }
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
