import { sendApiRequest } from '../../api/apiClient';
import { Student, StudentInput, StudentFilter } from './studentTypes';

export async function fetchStudents(
  filter: StudentFilter = {},
  token?: string | null
): Promise<Student[]> {
  const payload: Record<string, unknown> = {};
  if (filter.query) payload.query = filter.query;
  if (filter.status) payload.status = filter.status;

  const response = await sendApiRequest<Student[]>(
    'students.list',
    payload,
    { token }
  );
  return response.data || [];
}

export async function getStudentById(
  studentId: string,
  token?: string | null
): Promise<Student | null> {
  const response = await sendApiRequest<Student>(
    'students.get',
    { student_id: studentId },
    { token }
  );
  return response.data || null;
}

export async function createStudent(
  input: StudentInput,
  token?: string | null
): Promise<Student> {
  const response = await sendApiRequest<Student>(
    'students.create',
    input as unknown as Record<string, unknown>,
    { token }
  );
  return response.data!;
}

export async function updateStudent(
  studentId: string,
  input: Partial<StudentInput>,
  token?: string | null
): Promise<Student> {
  const response = await sendApiRequest<Student>(
    'students.update',
    { student_id: studentId, ...input },
    { token }
  );
  return response.data!;
}

export async function archiveStudent(
  studentId: string,
  token?: string | null
): Promise<Student> {
  const response = await sendApiRequest<Student>(
    'students.archive',
    { student_id: studentId },
    { token }
  );
  return response.data!;
}
