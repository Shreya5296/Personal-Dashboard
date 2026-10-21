export interface Student {
  student_id: string;
  student_name: string;
  parent_name: string;
  parent_phone: string;
  student_phone?: string;
  parent_email?: string;
  student_email?: string;
  subject?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  archived_at?: string;
  // Convenience aliases for UI components
  full_name?: string;
  email?: string;
  phone?: string;
}

export interface StudentInput {
  student_name: string;
  parent_name: string;
  parent_phone: string;
  student_phone?: string;
  parent_email?: string;
  student_email?: string;
  subject?: string;
  status?: string;
  notes?: string;
  // Convenience aliases for UI components
  full_name?: string;
  email?: string;
  phone?: string;
}

export interface StudentFilter {
  query?: string;
  status?: string;
}
