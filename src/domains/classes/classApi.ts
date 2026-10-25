import { sendApiRequest } from '../../api/apiClient';
import { ClassSession, ClassSessionInput, AttendanceStatus } from './classTypes';

export async function fetchClasses(
  studentId?: string,
  token?: string | null
): Promise<ClassSession[]> {
  const payload: Record<string, unknown> = {};
  if (studentId) payload.student_id = studentId;

  const response = await sendApiRequest<ClassSession[]>(
    'classes.list',
    payload,
    { token }
  );
  return response.data || [];
}

export async function scheduleClass(
  input: ClassSessionInput,
  token?: string | null
): Promise<ClassSession> {
  const response = await sendApiRequest<ClassSession>(
    'classes.schedule',
    input as unknown as Record<string, unknown>,
    { token }
  );
  return response.data!;
}

export async function batchScheduleClasses(
  studentId: string,
  sessions: ClassSessionInput[],
  token?: string | null
): Promise<ClassSession[]> {
  try {
    const response = await sendApiRequest<ClassSession[]>(
      'classes.batchSchedule',
      { student_id: studentId, sessions } as unknown as Record<string, unknown>,
      { token }
    );
    return response.data || [];
  } catch (err: unknown) {
    const msg = (err as Error)?.message || '';
    if (msg.includes('Unknown operation') && msg.includes('classes.batchSchedule')) {
      const scheduled: ClassSession[] = [];
      for (const s of sessions) {
        const item = await scheduleClass(s, token);
        scheduled.push(item);
      }
      return scheduled;
    }
    throw err;
  }
}

export async function recordAttendance(
  sessionId: string,
  outcome: AttendanceStatus,
  token?: string | null
): Promise<ClassSession> {
  const response = await sendApiRequest<ClassSession>(
    'classes.recordAttendance',
    { session_id: sessionId, outcome },
    { token }
  );
  return response.data!;
}

export async function restoreCredit(
  sessionId: string,
  reason?: string,
  token?: string | null
): Promise<ClassSession> {
  const response = await sendApiRequest<ClassSession>(
    'classes.restoreCredit',
    { session_id: sessionId, reason },
    { token }
  );
  return response.data!;
}
