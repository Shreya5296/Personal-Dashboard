import { ClassSession } from '../classes/classTypes';
import { WeeklyScheduleEntry, cleanTime } from '../classes/scheduleApi';
import { Student } from '../students/studentTypes';
import { Package } from '../packages/packageTypes';

const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export function getMondayForDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const day = dt.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

export function shiftMondayStr(mondayStr: string, days: number): string {
  const [y, m, d] = mondayStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return dt.toISOString().slice(0, 10);
}

export function getWeekDates(mondayStr: string): string[] {
  const [y, m, d] = mondayStr.split('-').map(Number);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i, 12, 0, 0));
    dates.push(dt.toISOString().slice(0, 10));
  }
  return dates;
}

export function makeIsoInTz(dateKey: string, timeStr: string, timeZone: string): string {
  const cleanT = cleanTime(timeStr) || '17:00';
  const tempDate = new Date(`${dateKey}T12:00:00Z`);
  let offset = '+05:30';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(tempDate);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    if (tzPart && tzPart.value.startsWith('GMT')) {
      offset = tzPart.value.replace('GMT', '');
      if (!offset.includes(':')) offset = `${offset}:00`;
    }
  } catch {
    // fallback to +05:30 for Asia/Kolkata
  }
  return `${dateKey}T${cleanT}:00${offset}`;
}

function parseTimeToMin(t?: string): number {
  const [h, m] = (cleanTime(t) || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function getDateKeyInTz(d: Date | null, timeZone: string): string {
  if (!d || isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    return '';
  }
}

export function generateCalendarEvents(params: {
  datedSessions: ClassSession[];
  recurringSchedules?: WeeklyScheduleEntry[];
  students?: Student[];
  packages?: Package[];
  weekDates: string[];
  activeTz: string;
}): ClassSession[] {
  const { datedSessions = [], recurringSchedules = [], students = [], packages = [], weekDates, activeTz } = params;
  const stuMap = new Map((students || []).map((s) => [s.student_id, s]));
  const pkgMap = new Map((packages || []).map((p) => [p.student_id, p]));
  const events: ClassSession[] = [];

  for (const dateStr of weekDates) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const dayOfWeek = WEEKDAYS[dt.getUTCDay()];

    const dayDated = datedSessions.filter((c) => {
      const raw = c.start_time || c.scheduled_start;
      if (!raw) return false;
      const parsed = new Date(String(raw).trim().replace(/T\s+(\d:)/, 'T0$1'));
      return !isNaN(parsed.getTime()) && getDateKeyInTz(parsed, activeTz) === dateStr;
    });

    events.push(...dayDated);

    const matchingScheds = (recurringSchedules || []).filter(
      (s) => s.day_of_week && s.day_of_week.toUpperCase() === dayOfWeek && s.is_active !== false
    );

    for (const sched of matchingScheds) {
      const sid = sched.student_id || '';
      const stu = stuMap.get(sid);
      if (stu && stu.status === 'ARCHIVED') continue;

      const pkg = pkgMap.get(sid);
      const stuStart = pkg?.start_date || (stu as unknown as { first_class_date?: string })?.first_class_date || '';
      if (stuStart && dateStr < stuStart) continue; // Respect First Class Date!
      if (pkg?.end_date && dateStr > pkg.end_date) continue; // Respect package end date

      const stuDated = datedSessions.filter((ds) => ds.student_id === sid && ds.session_status !== 'CANCELLED');
      if (stuDated.length > 0) {
        const earliest = stuDated.map((ds) => (ds.scheduled_start || ds.start_time || '').slice(0, 10)).filter(Boolean).sort()[0];
        if (earliest && dateStr < earliest) continue;
      }

      const startTime = cleanTime(sched.start_time) || '17:00';
      const endTime = cleanTime(sched.end_time) || '18:00';
      const duration = Math.max(15, parseTimeToMin(endTime) - parseTimeToMin(startTime));

      const hasDatedDuplicate = dayDated.some((ds) => {
        if (ds.student_id !== sid) return false;
        const dsRaw = ds.start_time || ds.scheduled_start;
        const dsParsed = new Date(String(dsRaw).trim().replace(/T\s+(\d:)/, 'T0$1'));
        if (isNaN(dsParsed.getTime())) return false;
        try {
          const dsTime = new Intl.DateTimeFormat('en-GB', { timeZone: activeTz, hour: '2-digit', minute: '2-digit', hour12: false }).format(dsParsed);
          return dsTime === startTime;
        } catch { return false; }
      });

      if (!hasDatedDuplicate) {
        const startIso = makeIsoInTz(dateStr, startTime, activeTz);
        const endIso = makeIsoInTz(dateStr, endTime, activeTz);
        events.push({
          session_id: `rec_${sched.schedule_id || sid}_${dateStr}`, student_id: sid,
          student_name: stu?.student_name || stu?.full_name || sched.student_name || sid || 'Student',
          topic: stu?.subject || 'Class Session', start_time: startIso, scheduled_start: startIso,
          scheduled_end: endIso, duration_minutes: duration, status: 'SCHEDULED', session_status: 'SCHEDULED',
          attendance_status: 'NOT_MARKED', class_credit_effect: 'PENDING', is_recurring: true,
        } as ClassSession & { is_recurring?: boolean });
      }
    }
  }

  return events;
}
