export interface FeeObligation {
  fee_id: string;
  fee_obligation_id?: string;
  student_id: string;
  student_name?: string;
  package_id?: string;
  description: string;
  obligation_description?: string;
  amount_due: number;
  credit_applied?: number;
  currency?: string;
  issue_date?: string;
  due_date: string;
  status: 'OPEN' | 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID' | string;
  obligation_status?: string;
  amount_paid: number;
  paid_amount?: number;
  outstanding_balance: number;
  outstanding_amount?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FeeObligationInput {
  student_id: string;
  student_name?: string;
  package_id?: string;
  description: string;
  obligation_description?: string;
  amount_due: number;
  credit_applied?: number;
  currency?: string;
  issue_date?: string;
  due_date: string;
  idempotency_key?: string;
  notes?: string;
}
