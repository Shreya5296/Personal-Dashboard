import { sendApiRequest } from '../../api/apiClient';
import { Payment, PaymentInput } from './paymentTypes';

export async function fetchPayments(
  studentId?: string,
  feeId?: string,
  token?: string | null
): Promise<Payment[]> {
  const payload: Record<string, unknown> = {};
  if (studentId) payload.student_id = studentId;
  if (feeId) payload.fee_id = feeId;

  const response = await sendApiRequest<Payment[]>(
    'payments.list',
    payload,
    { token }
  );
  return response.data || [];
}

export async function recordPayment(
  input: PaymentInput,
  token?: string | null
): Promise<Payment> {
  const response = await sendApiRequest<Payment>(
    'payments.record',
    input as unknown as Record<string, unknown>,
    { token }
  );
  return response.data!;
}

export async function voidPayment(
  paymentId: string,
  token?: string | null
): Promise<Payment> {
  const response = await sendApiRequest<Payment>(
    'payments.void',
    { payment_id: paymentId },
    { token }
  );
  return response.data!;
}
