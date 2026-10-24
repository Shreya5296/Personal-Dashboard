import { sendApiRequest } from '../../api/apiClient';
import { FinancialSummary, ReportFilter } from './reportTypes';

export async function fetchFinancialSummary(
  token?: string | null,
  filter?: ReportFilter
): Promise<FinancialSummary> {
  const payload: Record<string, unknown> = {};
  if (filter?.startDate) payload.startDate = filter.startDate;
  if (filter?.endDate) payload.endDate = filter.endDate;

  const response = await sendApiRequest<Record<string, unknown>>(
    'reports.financialSummary',
    payload,
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
