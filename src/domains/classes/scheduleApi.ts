import { sendApiRequest } from '../../api/apiClient';
import { getSavedTimezone } from '../../lib/userPreferences';

export interface WeeklyScheduleEntry {
  schedule_id?: string;
  student_id?: string;
  student_name?: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

export function cleanTime(t?: string | null): string {
  if (!t) return '';
  const str = String(t).trim();
  if (/^1899-12-30T/.test(str)) {
    const d = new Date(str);
    try {
      const tz = getSavedTimezone();
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(d);
      const h = parts.find((p) => p.type === 'hour')?.value || '00';
      const m = parts.find((p) => p.type === 'minute')?.value || '00';
      return `${h}:${m}`;
    } catch {
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    }
  }
  const clean = str.replace(/^'/, '');
  const ampmMatch = clean.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const mins = ampmMatch[2];
    const isPm = ampmMatch[3].toLowerCase() === 'pm';
    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${mins}`;
  }
  const match = clean.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return clean;
}

export async function fetchSchedules(
  studentId?: string,
  token?: string | null
): Promise<WeeklyScheduleEntry[]> {
  const payload: Record<string, unknown> = {};
  if (studentId) payload.student_id = studentId;
  const res = await sendApiRequest<WeeklyScheduleEntry[]>(
    'schedules.list',
    payload,
    { token }
  );
  const list = Array.isArray(res.data) ? res.data : [];
  return list.map((s) => ({
    ...s,
    start_time: cleanTime(s.start_time),
    end_time: cleanTime(s.end_time),
  }));
}

export async function saveSchedules(
  studentId: string,
  schedules: WeeklyScheduleEntry[],
  token?: string | null
): Promise<WeeklyScheduleEntry[]> {
  const sanitized = schedules.map((s) => ({
    ...s,
    start_time: cleanTime(s.start_time),
    end_time: cleanTime(s.end_time),
  }));
  const res = await sendApiRequest<WeeklyScheduleEntry[]>(
    'schedules.save',
    { student_id: studentId, schedules: sanitized },
    { token }
  );
  const list = Array.isArray(res.data) ? res.data : [];
  return list.map((s) => ({
    ...s,
    start_time: cleanTime(s.start_time),
    end_time: cleanTime(s.end_time),
  }));
}
