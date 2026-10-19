export interface FinancialSummary {
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  currency: string;
}

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
}
