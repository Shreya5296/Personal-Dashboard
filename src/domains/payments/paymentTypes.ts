export interface Payment {
  payment_id: string;
  student_id: string;
  student_name?: string;
  fee_id?: string;
  fee_obligation_id?: string;
  amount: number;
  currency?: string;
  in_inr?: number;
  payment_date: string;
  payment_method: 'UPI' | 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | string;
  reference_number?: string;
  transaction_reference?: string;
  idempotency_key?: string;
  status: 'RECORDED' | 'COMPLETED' | 'VOID' | string;
  payment_status?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  voided_at?: string;
  void_reason?: string;
}

export interface PaymentInput {
  student_id: string;
  student_name?: string;
  fee_id?: string;
  fee_obligation_id?: string;
  amount: number;
  currency?: string;
  in_inr?: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  transaction_reference?: string;
  idempotency_key?: string;
  allow_overpayment?: boolean;
  notes?: string;
}
