import { sendApiRequest } from '../../api/apiClient';
import { Student, StudentInput, StudentFilter } from './studentTypes';

export function adaptStudentInput(input: Partial<StudentInput>): Record<string, unknown> {
  const parts = (input.full_name || '').trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ');
  const primaryPhone = input.parent_phone || input.phone || '';
  const parentEmail = input.parent_email || input.email || '';
  const parentGuardianName = input.parent_name || '';

  let notesText = input.notes || '';
  if (input.subject && input.subject.trim()) {
    const subjTag = `[Subject: ${input.subject.trim()}]`;
    if (!notesText.includes(subjTag)) {
      notesText = notesText ? `${subjTag} ${notesText}` : subjTag;
    }
  }

  return {
    ...input,
    first_name: firstName,
    last_name: lastName,
    parent_guardian_name: parentGuardianName,
    primary_phone: primaryPhone,
    parent_email: parentEmail,
    internal_summary: notesText,
    subject: input.subject?.trim() || '',
  };
}

export function enrichStudentData(student: Student): Student {
  if (!student) return student;
  let subject = student.subject || '';
  let notes = student.notes || '';
  if (!subject && notes) {
    const match = notes.match(/\[Subject:\s*([^\]]+)\]/i);
    if (match) {
      subject = match[1].trim();
      notes = notes.replace(match[0], '').trim();
    }
  }
  return { ...student, subject, notes };
}

export async function fetchStudents(
  filter: StudentFilter = {},
  token?: string | null
): Promise<Student[]> {
  const payload: Record<string, unknown> = {};
  if (filter.query) {
    payload.query = filter.query;
    payload.search = filter.query;
  }
  if (filter.status) {
    payload.status = filter.status;
  }

  const response = await sendApiRequest<Student[] | Record<string, unknown>>(
    'students.list',
    payload,
    { token }
  );

  if (Array.isArray(response.data)) {
    return (response.data as Student[]).map(enrichStudentData);
  }
  if (response.data && typeof response.data === 'object') {
    const obj = response.data as Record<string, unknown>;
    if (Array.isArray(obj.students)) return (obj.students as Student[]).map(enrichStudentData);
    if (Array.isArray(obj.items)) return (obj.items as Student[]).map(enrichStudentData);
  }
  return [];
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
  return response.data ? enrichStudentData(response.data) : null;
}

export async function createStudent(
  input: StudentInput,
  token?: string | null
): Promise<Student> {
  const payload = adaptStudentInput(input);
  const response = await sendApiRequest<Student>(
    'students.create',
    payload,
    { token }
  );
  return enrichStudentData(response.data!);
}

export async function updateStudent(
  studentId: string,
  input: Partial<StudentInput>,
  token?: string | null
): Promise<Student> {
  const adapted = adaptStudentInput(input);
  const response = await sendApiRequest<Student>(
    'students.update',
    { student_id: studentId, ...adapted },
    { token }
  );
  return enrichStudentData(response.data!);
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

export async function reactivateStudent(
  studentId: string,
  token?: string | null
): Promise<Student> {
  const response = await sendApiRequest<Student>(
    'students.reactivate',
    { student_id: studentId },
    { token }
  );
  return response.data!;
}
