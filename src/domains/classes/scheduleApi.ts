import { sendApiRequest } from '../../api/apiClient';

export interface WeeklyScheduleEntry {
  schedule_id?: string;
  student_id?: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
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
  return Array.isArray(res.data) ? res.data : [];
}

export async function saveSchedules(
  studentId: string,
  schedules: WeeklyScheduleEntry[],
  token?: string | null
): Promise<WeeklyScheduleEntry[]> {
  const res = await sendApiRequest<WeeklyScheduleEntry[]>(
    'schedules.save',
    { student_id: studentId, schedules },
    { token }
  );
  return Array.isArray(res.data) ? res.data : [];
}
