import { sendApiRequest } from '../../api/apiClient';
import { Enrollment, EnrollmentInput } from './enrollmentTypes';

export async function fetchEnrollments(
  studentId?: string,
  token?: string | null
): Promise<Enrollment[]> {
  const payload: Record<string, unknown> = {};
  if (studentId) payload.student_id = studentId;

  const response = await sendApiRequest<Enrollment[]>(
    'enrollments.list',
    payload,
    { token }
  );
  return response.data || [];
}

export async function createEnrollment(
  input: EnrollmentInput,
  token?: string | null
): Promise<Enrollment> {
  const response = await sendApiRequest<Enrollment>(
    'enrollments.create',
    input as unknown as Record<string, unknown>,
    { token }
  );
  return response.data!;
}

export async function updateEnrollment(
  enrollmentId: string,
  input: Partial<EnrollmentInput> & { status?: string },
  token?: string | null
): Promise<Enrollment> {
  const response = await sendApiRequest<Enrollment>(
    'enrollments.update',
    { enrollment_id: enrollmentId, ...input },
    { token }
  );
  return response.data!;
}
