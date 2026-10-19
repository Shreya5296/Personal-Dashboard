export interface Payment {
  payment_id: string;
  student_id: string;
  fee_id?: string;
  amount: number;
  payment_date: string;
  payment_method: 'UPI' | 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | string;
  reference_number?: string;
  idempotency_key?: string;
  status: 'COMPLETED' | 'VOID' | string;
  notes?: string;
  created_at?: string;
}

export interface PaymentInput {
  student_id: string;
  fee_id?: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  idempotency_key?: string;
  notes?: string;
}
