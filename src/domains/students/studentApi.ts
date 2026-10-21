import { sendApiRequest } from '../../api/apiClient';
import { Student, StudentInput, StudentFilter } from './studentTypes';

export function parseSubjectAndNotes(text?: string | null): { subject: string; notes: string } {
  if (!text) return { subject: '', notes: '' };
  const str = String(text).trim();
  const lines = str.split(/\r?\n/);
  const fullLineMatch = lines[0].trim().match(/^\[Subject:\s*(.*)\]$/i);
  if (fullLineMatch) {
    return { subject: fullLineMatch[1].trim(), notes: lines.slice(1).join('\n').trim() };
  }
  const inlineMatch = str.match(/^\[Subject:\s*(.*?)(?:\]\s+|\s*\]$)([\s\S]*)$/i);
  if (inlineMatch) {
    return { subject: inlineMatch[1].trim(), notes: inlineMatch[2].trim() };
  }
  return { subject: '', notes: str };
}

export function formatSubjectAndNotes(subject?: string | null, notes?: string | null): string {
  const cleanSubj = (subject || '').trim();
  let cleanNotes = (notes || '').trim();
  const parsed = parseSubjectAndNotes(cleanNotes);
  if (parsed.subject) cleanNotes = parsed.notes;
  if (!cleanSubj) return cleanNotes;
  return cleanNotes ? `[Subject: ${cleanSubj}]\n${cleanNotes}` : `[Subject: ${cleanSubj}]`;
}

export function adaptStudentInput(input: Partial<StudentInput>): Record<string, unknown> {
  const parts = (input.full_name || '').trim().split(/\s+/);
  return {
    ...input,
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' '),
    parent_guardian_name: input.parent_name || '',
    primary_phone: input.parent_phone || input.phone || '',
    parent_email: input.parent_email || input.email || '',
    internal_summary: formatSubjectAndNotes(input.subject, input.notes),
    subject: input.subject?.trim() || '',
  };
}

export function enrichStudentData(student: Student): Student {
  if (!student) return student;
  let subject = student.subject || '';
  let notes = student.notes || '';
  if (!subject && notes) {
    const parsed = parseSubjectAndNotes(notes);
    if (parsed.subject) {
      subject = parsed.subject;
      notes = parsed.notes;
    }
  }
  return { ...student, subject, notes };
}

export async function fetchStudents(filter: StudentFilter = {}, token?: string | null): Promise<Student[]> {
  const payload: Record<string, unknown> = {};
  if (filter.query) { payload.query = filter.query; payload.search = filter.query; }
  if (filter.status) payload.status = filter.status;

  const res = await sendApiRequest<Student[] | Record<string, unknown>>('students.list', payload, { token });
  if (Array.isArray(res.data)) return (res.data as Student[]).map(enrichStudentData);
  if (res.data && typeof res.data === 'object') {
    const obj = res.data as Record<string, unknown>;
    if (Array.isArray(obj.students)) return (obj.students as Student[]).map(enrichStudentData);
    if (Array.isArray(obj.items)) return (obj.items as Student[]).map(enrichStudentData);
  }
  return [];
}

export async function getStudentById(studentId: string, token?: string | null): Promise<Student | null> {
  const res = await sendApiRequest<Student>('students.get', { student_id: studentId }, { token });
  return res.data ? enrichStudentData(res.data) : null;
}

export async function createStudent(input: StudentInput, token?: string | null): Promise<Student> {
  const res = await sendApiRequest<Student>('students.create', adaptStudentInput(input), { token });
  return enrichStudentData(res.data!);
}

export async function updateStudent(
  studentId: string,
  input: Partial<StudentInput>,
  token?: string | null
): Promise<Student> {
  const adapted = adaptStudentInput(input);
  const res = await sendApiRequest<Student>('students.update', { student_id: studentId, ...adapted }, { token });
  return enrichStudentData(res.data!);
}

export async function archiveStudent(studentId: string, token?: string | null): Promise<Student> {
  const res = await sendApiRequest<Student>('students.archive', { student_id: studentId }, { token });
  return res.data!;
}

export async function reactivateStudent(studentId: string, token?: string | null): Promise<Student> {
  const res = await sendApiRequest<Student>('students.reactivate', { student_id: studentId }, { token });
  return res.data!;
}
