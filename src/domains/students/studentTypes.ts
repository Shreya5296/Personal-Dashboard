export interface Student {
  student_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  status: 'ACTIVE' | 'ARCHIVED' | string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StudentInput {
  full_name: string;
  email?: string;
  phone?: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  notes?: string;
}

export interface StudentFilter {
  query?: string;
  status?: string;
}
