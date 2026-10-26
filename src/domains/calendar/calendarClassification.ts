import { toInputDateFormat } from '../../lib/dateFormat';
import { cleanTime } from '../classes/scheduleApi';
import { makeIsoInTz } from '../dashboard/calendarEventGenerator';

export type CalendarDisplayCategory = 'PAST_COMPLETED' | 'CANCELLED' | 'UPCOMING';

export interface CalendarClassificationParams {
  status?: string | null;
  sessionStatus?: string | null;
  attendanceStatus?: string | null;
  isCancelled?: boolean;
  isPast?: boolean;
}

/**
 * Determines whether an event is in the past based on date and end time in activeTz.
 * - Previous day is past.
 * - Future day is upcoming.
 * - Today is past only after end time.
 */
export function isEventPast(
  dateKey: string,
  endTimeOrEndIso: string | null | undefined,
  activeTz = 'Asia/Kolkata',
  now = new Date()
): boolean {
  const todayKey = toInputDateFormat(now, activeTz);
  if (dateKey < todayKey) return true;
  if (dateKey > todayKey) return false;

  if (!endTimeOrEndIso) return false;

  if (endTimeOrEndIso.includes('T')) {
    const endMs = new Date(endTimeOrEndIso).getTime();
    if (!isNaN(endMs)) return endMs < now.getTime();
  }

  const cleanEnd = cleanTime(endTimeOrEndIso);
  if (cleanEnd) {
    const endIso = makeIsoInTz(todayKey, cleanEnd, activeTz);
    const endMs = new Date(endIso).getTime();
    if (!isNaN(endMs)) return endMs < now.getTime();
  }

  return false;
}

/**
 * Shared rule for the three visual treatments:
 * 1. Past class marked PRESENT / COMPLETED -> PAST_COMPLETED (muted green)
 * 2. Past or explicitly cancelled class -> CANCELLED (muted red)
 * 3. Upcoming valid class (dated or recurring) -> UPCOMING (yellow/amber)
 */
export function classifyCalendarEvent(params: CalendarClassificationParams): CalendarDisplayCategory {
  if (params.isCancelled) return 'CANCELLED';

  const sessStatus = (params.sessionStatus || params.status || '').toUpperCase();
  const attStatus = (params.attendanceStatus || '').toUpperCase();

  if (sessStatus === 'CANCELLED' || attStatus === 'CANCELLED' || attStatus === 'ABSENT' || attStatus === 'NO_SHOW') {
    return 'CANCELLED';
  }

  const isCompleted = sessStatus === 'COMPLETED' || attStatus === 'PRESENT' || attStatus === 'ATTENDED';
  if (isCompleted) {
    return 'PAST_COMPLETED';
  }

  if (params.isPast) {
    return 'CANCELLED';
  }

  return 'UPCOMING';
}
