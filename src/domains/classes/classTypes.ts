export type AttendanceStatus = 'SCHEDULED' | 'ATTENDED' | 'NO_SHOW' | 'CANCELLED';

export interface ClassSession {
  session_id: string;
  student_id: string;
  package_id?: string;
  meeting_link_id?: string;
  topic?: string;
  start_time: string;
  duration_minutes: number;
  status: AttendanceStatus | string;
  class_credit_effect: 'CONSUME' | 'NO_CONSUME' | 'CREDIT_BACK';
  credit_restoration_for_session_id?: string;
  meeting_url?: string;
  notes?: string;
  created_at?: string;
}

export interface ClassSessionInput {
  student_id: string;
  package_id?: string;
  meeting_link_id?: string;
  topic?: string;
  start_time: string;
  duration_minutes: number;
  notes?: string;
}
