export interface StudentNote {
  note_id: string;
  student_id: string;
  note_type?: string;
  content: string;
  follow_up_date?: string;
  is_resolved?: boolean;
  created_at?: string;
}

export interface StudentNoteInput {
  student_id: string;
  note_type?: string;
  content: string;
  follow_up_date?: string;
}
