import { sendApiRequest } from '../../api/apiClient';
import { StudentNote, StudentNoteInput } from './noteTypes';

export async function fetchNotes(
  studentId: string,
  token?: string | null
): Promise<StudentNote[]> {
  const response = await sendApiRequest<StudentNote[]>(
    'notes.list',
    { student_id: studentId },
    { token }
  );
  return response.data || [];
}

export async function createNote(
  input: StudentNoteInput,
  token?: string | null
): Promise<StudentNote> {
  const response = await sendApiRequest<StudentNote>(
    'notes.create',
    input as unknown as Record<string, unknown>,
    { token }
  );
  return response.data!;
}
