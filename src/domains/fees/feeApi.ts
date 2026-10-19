import { sendApiRequest } from '../../api/apiClient';
import { FeeObligation, FeeObligationInput } from './feeTypes';

export async function fetchFeeObligations(
  studentId?: string,
  token?: string | null
): Promise<FeeObligation[]> {
  const payload: Record<string, unknown> = {};
  if (studentId) payload.student_id = studentId;

  const response = await sendApiRequest<FeeObligation[]>(
    'fees.list',
    payload,
    { token }
  );
  return response.data || [];
}

export async function createFeeObligation(
  input: FeeObligationInput,
  token?: string | null
): Promise<FeeObligation> {
  const response = await sendApiRequest<FeeObligation>(
    'fees.create',
    input as unknown as Record<string, unknown>,
    { token }
  );
  return response.data!;
}

export async function voidFeeObligation(
  feeId: string,
  token?: string | null
): Promise<FeeObligation> {
  const response = await sendApiRequest<FeeObligation>(
    'fees.void',
    { fee_id: feeId },
    { token }
  );
  return response.data!;
}
