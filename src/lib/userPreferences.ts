/**
 * userPreferences: Safe persistence and helpers for application timezone and currency preferences.
 * Persists to localStorage across browser refreshes and sessions.
 * Never performs destructive schema migrations or automatic financial FX conversion.
 */

const TIMEZONE_KEY = 'smd_pref_timezone';
const CURRENCY_KEY = 'smd_pref_currency';

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const DEFAULT_CURRENCY = 'INR';

export interface TimezoneOption {
  value: string;
  label: string;
}

export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

export const SUPPORTED_TIMEZONES: TimezoneOption[] = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata — India Standard Time (IST, UTC+5:30)' },
  { value: 'UTC', label: 'UTC — Coordinated Universal Time' },
  { value: 'America/New_York', label: 'America/New_York — Eastern Time (ET, UTC-5/-4)' },
  { value: 'America/Chicago', label: 'America/Chicago — Central Time (CT, UTC-6/-5)' },
  { value: 'America/Denver', label: 'America/Denver — Mountain Time (MT, UTC-7/-6)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles — Pacific Time (PT, UTC-8/-7)' },
  { value: 'Europe/London', label: 'Europe/London — GMT / BST (UTC+0/+1)' },
  { value: 'Europe/Paris', label: 'Europe/Paris — Central European Time (CET, UTC+1/+2)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai — Gulf Standard Time (GST, UTC+4)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore — Singapore Time (SGT, UTC+8)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney — Australian Eastern Time (AET, UTC+10/+11)' },
];

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'INR', symbol: '₹', label: 'INR — Indian Rupee (₹)' },
  { code: 'USD', symbol: '$', label: 'USD — US Dollar ($)' },
  { code: 'GBP', symbol: '£', label: 'GBP — British Pound (£)' },
  { code: 'EUR', symbol: '€', label: 'EUR — Euro (€)' },
  { code: 'SGD', symbol: 'S$', label: 'SGD — Singapore Dollar (S$)' },
  { code: 'AED', symbol: 'AED ', label: 'AED — UAE Dirham (AED)' },
  { code: 'CAD', symbol: 'C$', label: 'CAD — Canadian Dollar (C$)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD — Australian Dollar (A$)' },
];

let inMemoryTimezone = DEFAULT_TIMEZONE;
let inMemoryCurrency = DEFAULT_CURRENCY;

export function getSavedTimezone(): string {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(TIMEZONE_KEY);
      if (saved && SUPPORTED_TIMEZONES.some((tz) => tz.value === saved)) {
        return saved;
      }
    }
  } catch {
    // Ignore storage read restriction
  }
  return inMemoryTimezone;
}

export function saveTimezone(timezone: string): void {
  inMemoryTimezone = timezone;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TIMEZONE_KEY, timezone);
    }
  } catch {
    // Ignore storage write restriction
  }
}

export function getSavedCurrency(): string {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(CURRENCY_KEY);
      if (saved && SUPPORTED_CURRENCIES.some((c) => c.code === saved)) {
        return saved;
      }
    }
  } catch {
    // Ignore storage read restriction
  }
  return inMemoryCurrency;
}

export function saveCurrency(currency: string): void {
  inMemoryCurrency = currency;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CURRENCY_KEY, currency);
    }
  } catch {
    // Ignore storage write restriction
  }
}

export function getCurrencySymbol(currencyCode: string): string {
  const match = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
  return match ? match.symbol : `${currencyCode} `;
}
