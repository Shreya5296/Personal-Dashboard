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
  const name = String(input.student_name || input.full_name || '').trim();
  const parentName = String(input.parent_name || '').trim();
  const parentPhone = String(input.parent_phone || input.phone || '').trim();
  const studentPhone = String(input.student_phone || '').trim();
  const parentEmail = String(input.parent_email || '').trim();
  const studentEmail = String(input.student_email || input.email || '').trim();
  let subjectStr = '';
  if (Array.isArray(input.subjects)) {
    subjectStr = input.subjects.join(', ');
  } else if (Array.isArray(input.subject)) {
    subjectStr = (input.subject as string[]).join(', ');
  } else {
    subjectStr = String(input.subject || '').trim();
  }
  const notes = String(input.notes || '').trim();
  const status = input.status ? String(input.status).trim().toUpperCase() : 'ACTIVE';
  const subjectsArr = subjectStr ? subjectStr.split(',').map((s) => s.trim()).filter(Boolean) : [];

  return {
    student_name: name,
    parent_name: parentName,
    parent_phone: parentPhone,
    student_phone: studentPhone,
    parent_email: parentEmail,
    student_email: studentEmail,
    subject: subjectStr,
    subjects: subjectsArr,
    status,
    notes,
    full_name: name,
    phone: parentPhone,
    email: parentEmail,
    internal_summary: formatSubjectAndNotes(subjectStr, notes),
  };
}

export function enrichStudentData(student: Student): Student {
  if (!student) return student;
  const name = String(student.student_name || student.full_name || '');
  let subject = String(student.subject || '');
  let notes = String(student.notes || '');
  if (!subject && notes) {
    const parsed = parseSubjectAndNotes(notes);
    if (parsed.subject) {
      subject = parsed.subject;
      notes = parsed.notes;
    }
  }
  const subjects = Array.isArray(student.subjects)
    ? student.subjects
    : (subject ? subject.split(',').map((s) => s.trim()).filter(Boolean) : []);
  return {
    ...student,
    student_name: name,
    full_name: name,
    parent_name: String(student.parent_name || ''),
    parent_phone: String(student.parent_phone || student.phone || ''),
    student_phone: String(student.student_phone || ''),
    parent_email: String(student.parent_email || student.email || ''),
    student_email: String(student.student_email || ''),
    subject,
    subjects,
    status: student.status ? String(student.status).trim().toUpperCase() : 'ACTIVE',
    notes,
  };
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
