import { getSavedCurrency, getCurrencySymbol } from './userPreferences';

export function formatCurrency(
  amount: number | null | undefined,
  showSymbol = true,
  currencyOverride?: string
): string {
  const currencyCode = currencyOverride || getSavedCurrency();
  const symbol = getCurrencySymbol(currencyCode);

  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? `${symbol}0` : '0';
  }

  const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);

  return showSymbol ? `${symbol}${formatted}` : formatted;
}

export function parseCurrencyInput(input: string): number {
  if (!input) return 0;
  const clean = input.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
}
