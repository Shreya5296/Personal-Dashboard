export interface MeetingLink {
  meeting_link_id: string;
  student_id?: string;
  student_name?: string;
  meeting_link_1?: string;
  meeting_link_2?: string;
  provider: 'GOOGLE_MEET' | 'ZOOM' | 'MS_TEAMS' | 'OTHER' | string;
  meeting_url: string;
  label?: string;
  link_label?: string;
  is_preferred: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | string;
  link_status?: 'ACTIVE' | 'INACTIVE' | string;
  created_at?: string;
}

export interface MeetingLinkInput {
  student_id?: string;
  student_name?: string;
  meeting_link_1?: string;
  meeting_link_2?: string;
  provider: string;
  meeting_url: string;
  label?: string;
  link_label?: string;
  is_preferred?: boolean;
}
