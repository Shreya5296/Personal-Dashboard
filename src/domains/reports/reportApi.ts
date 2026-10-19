import { sendApiRequest } from '../../api/apiClient';
import { FinancialSummary } from './reportTypes';

export async function fetchFinancialSummary(
  token?: string | null
): Promise<FinancialSummary> {
  const response = await sendApiRequest<FinancialSummary>(
    'reports.financialSummary',
    {},
    { token }
  );
  return response.data || {
    totalInvoiced: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    currency: 'INR',
  };
}
