import { formatCurrency } from './currencyFormat';

export interface OutstandingDisplay {
  text: string;
  color: string;
  isNil: boolean;
  isUnknown: boolean;
}

export function formatOutstandingBalance(
  amount?: number | null,
  currency: string = 'INR'
): OutstandingDisplay {
  if (amount === undefined || amount === null || (typeof amount === 'number' && isNaN(amount))) {
    return {
      text: '—',
      color: 'var(--color-text-subtle)',
      isNil: false,
      isUnknown: true,
    };
  }
  if (amount <= 0) {
    return {
      text: 'NIL',
      color: '#64748b',
      isNil: true,
      isUnknown: false,
    };
  }
  return {
    text: formatCurrency(amount, true, currency),
    color: '#dc2626',
    isNil: false,
    isUnknown: false,
  };
}
