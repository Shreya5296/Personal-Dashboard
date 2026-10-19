export interface FeeObligation {
  fee_id: string;
  student_id: string;
  package_id?: string;
  description: string;
  amount_due: number;
  due_date: string;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID' | string;
  amount_paid: number;
  outstanding_balance: number;
  notes?: string;
  created_at?: string;
}

export interface FeeObligationInput {
  student_id: string;
  package_id?: string;
  description: string;
  amount_due: number;
  due_date: string;
  notes?: string;
}
