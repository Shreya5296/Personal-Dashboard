import { Payment } from '../payments/paymentTypes';

export interface FinancialSummary {
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  currency: string;
}

export interface FinanceFilter {
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface StudentBalanceRecord {
  student_id: string;
  student_name: string;
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  paymentCount: number;
  lastPaymentDate?: string;
  currency?: string;
  inInr?: number;
}

export type FinanceTab = 'history' | 'balances';

export type { Payment };
