import { ClassSession } from './classTypes';
import { Package } from '../packages/packageTypes';
import { cleanTime } from './scheduleApi';
import { calculateEndTime } from './scheduleDurationCalculator';
import { formatTimeTo12Hour, formatTimeRange12Hour } from '../../lib/time12Format';

export function getSessionDate(
  session?: Partial<ClassSession> | null,
  activeTz = 'Asia/Kolkata'
): string {
  if (!session) return '';
  const dateStr = session.schedule_date || session.class_date;
  if (dateStr) {
    const s = String(dateStr).trim();
    if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  }
  const rawStart = session.scheduled_start || session.start_time;
  if (rawStart) {
    const s = String(rawStart).trim();
    if (s.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (s.includes('T')) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        try {
          return new Intl.DateTimeFormat('en-CA', {
            timeZone: activeTz, year: 'numeric', month: '2-digit', day: '2-digit',
          }).format(d);
        } catch {
          return s.slice(0, 10);
        }
      }
      return s.slice(0, 10);
    }
  }
  return '';
}

export function getSessionStartTime(
  session?: Partial<ClassSession> | null,
  activeTz = 'Asia/Kolkata'
): string {
  if (!session) return '';
  if (session.schedule_time) {
    const cleaned = cleanTime(session.schedule_time);
    if (cleaned) return cleaned;
  }
  if (session.start_time) {
    const s = String(session.start_time).trim();
    if (!s.includes('T')) {
      const cleaned = cleanTime(s);
      if (cleaned) return cleaned;
    }
  }
  const rawIso = session.scheduled_start || session.start_time;
  if (rawIso) {
    const s = String(rawIso).trim();
    if (s.includes('T')) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        try {
          return new Intl.DateTimeFormat('en-GB', {
            timeZone: activeTz, hour: '2-digit', minute: '2-digit', hour12: false,
          }).format(d);
        } catch {
          return cleanTime(s.split('T')[1]?.slice(0, 5)) || '';
        }
      }
      return cleanTime(s.split('T')[1]?.slice(0, 5)) || '';
    }
  }
  return '';
}

export function getSessionDuration(
  session?: Partial<ClassSession> | null,
  pkg?: Partial<Package> | null
): number {
  if (session?.duration_minutes && typeof session.duration_minutes === 'number' && session.duration_minutes > 0) {
    return session.duration_minutes;
  }
  if (pkg?.class_duration && typeof pkg.class_duration === 'number' && pkg.class_duration > 0) {
    return pkg.class_duration;
  }
  return 60;
}

export function getSessionEndTime(
  session?: Partial<ClassSession> | null,
  pkg?: Partial<Package> | null,
  activeTz = 'Asia/Kolkata'
): string {
  const startTime = getSessionStartTime(session, activeTz);
  if (!startTime) return '';
  const duration = getSessionDuration(session, pkg);
  return calculateEndTime(startTime, duration) || '';
}

export function formatSessionTimeRange(
  session?: Partial<ClassSession> | null,
  pkg?: Partial<Package> | null,
  activeTz = 'Asia/Kolkata'
): string {
  const startTime = getSessionStartTime(session, activeTz);
  if (!startTime) return '—';
  const endTime = getSessionEndTime(session, pkg, activeTz);
  if (endTime) return formatTimeRange12Hour(startTime, endTime);
  return formatTimeTo12Hour(startTime);
}

export function isSessionOnDate(
  session?: Partial<ClassSession> | null,
  targetDateKey?: string,
  activeTz = 'Asia/Kolkata'
): boolean {
  if (!session || !targetDateKey) return false;
  const sessionDate = getSessionDate(session, activeTz);
  return Boolean(sessionDate && sessionDate === targetDateKey);
}
