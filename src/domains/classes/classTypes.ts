export type AttendanceStatus = 'SCHEDULED' | 'ATTENDED' | 'NO_SHOW' | 'CANCELLED';

export interface ClassSession {
  session_id: string;
  class_session_id?: string;
  student_id: string;
  student_name?: string;
  package_id?: string;
  meeting_link_id?: string;
  topic?: string;
  class_title?: string;
  start_time: string;
  scheduled_start?: string;
  scheduled_end?: string;
  duration_minutes: number;
  status: AttendanceStatus | string;
  session_status?: string;
  attendance_status?: string;
  class_credit_effect: 'CONSUME' | 'NO_CONSUME' | 'CREDIT_BACK' | 'PENDING';
  credit_restoration_for_session_id?: string;
  cancellation_reason?: string;
  meeting_url?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
}

export interface ClassSessionInput {
  student_id: string;
  student_name?: string;
  package_id?: string;
  meeting_link_id?: string;
  topic?: string;
  class_title?: string;
  start_time: string;
  scheduled_start?: string;
  scheduled_end?: string;
  duration_minutes: number;
  notes?: string;
}
