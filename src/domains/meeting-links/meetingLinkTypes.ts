export interface MeetingLink {
  meeting_link_id: string;
  student_id?: string;
  provider: 'GOOGLE_MEET' | 'ZOOM' | 'MS_TEAMS' | 'OTHER' | string;
  meeting_url: string;
  label?: string;
  is_preferred: boolean;
  status: 'ACTIVE' | 'INACTIVE' | string;
  created_at?: string;
}

export interface MeetingLinkInput {
  student_id?: string;
  provider: string;
  meeting_url: string;
  label?: string;
  is_preferred?: boolean;
}
