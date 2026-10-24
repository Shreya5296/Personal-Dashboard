import { sendApiRequest } from '../../api/apiClient';

export interface WeeklyScheduleEntry {
  schedule_id?: string;
  student_id?: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

export function cleanTime(t?: string | null): string {
  if (!t) return '';
  const str = String(t).trim();
  if (/^1899-12-30T/.test(str)) {
    const d = new Date(str);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }
  return str.replace(/^'/, '');
}

export async function fetchSchedules(
  studentId: string,
  token?: string | null
): Promise<WeeklyScheduleEntry[]> {
  if (!studentId) return [];
  const res = await sendApiRequest<WeeklyScheduleEntry[]>(
    'schedules.list',
    { student_id: studentId },
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
