export interface Enrollment {
  enrollment_id: string;
  student_id: string;
  course_name: string;
  level_or_grade?: string;
  start_date: string;
  end_date?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED' | string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EnrollmentInput {
  student_id: string;
  course_name: string;
  level_or_grade?: string;
  start_date: string;
  end_date?: string;
  notes?: string;
}
