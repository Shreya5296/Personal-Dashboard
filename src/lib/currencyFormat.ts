import { CURRENCY_SYMBOL } from '../config/publicConfig';

export function formatCurrency(amount: number | null | undefined, showSymbol = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? `${CURRENCY_SYMBOL}0` : '0';
  }

  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);

  return showSymbol ? `${CURRENCY_SYMBOL}${formatted}` : formatted;
}

export function parseCurrencyInput(input: string): number {
  if (!input) return 0;
  const clean = input.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
}
