import { sendApiRequest } from '../../api/apiClient';
import { FinancialSummary } from './reportTypes';

export async function fetchFinancialSummary(
  token?: string | null
): Promise<FinancialSummary> {
  const response = await sendApiRequest<Record<string, unknown>>(
    'reports.financialSummary',
    {},
    { token }
  );
  const data = response.data || {};
  return {
    totalInvoiced: Number(data.totalInvoiced ?? data.totalBilled ?? 0),
    totalCollected: Number(data.totalCollected ?? data.totalReceived ?? 0),
    totalOutstanding: Number(data.totalOutstanding ?? 0),
    currency: String(data.currency || 'INR'),
  };
}
