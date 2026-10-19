import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, isPastDate } from '../../src/lib/dateFormat';
import { formatCurrency, parseCurrencyInput } from '../../src/lib/currencyFormat';
import { isValidHttpsUrl, sanitizeUrl } from '../../src/lib/urlSafety';
import { truncateText, formatStatusBadge } from '../../src/lib/textFormat';

describe('Frontend Formatters & Utilities', () => {
  it('formats dates and datetimes in Asia/Kolkata timezone', () => {
    const iso = '2026-03-15T10:30:00.000Z';
    expect(formatDate(iso)).toContain('2026');
    expect(formatDateTime(iso)).toContain('2026');
    expect(formatDate(null)).toBe('—');
    expect(formatDate('invalid-date')).toBe('—');
  });

  it('detects past dates correctly', () => {
    expect(isPastDate('2020-01-01T00:00:00.000Z')).toBe(true);
    expect(isPastDate('2099-01-01T00:00:00.000Z')).toBe(false);
  });

  it('formats INR currency with rupee symbol and Indian number format', () => {
    expect(formatCurrency(15000)).toBe('₹15,000');
    expect(formatCurrency(0)).toBe('₹0');
    expect(formatCurrency(null)).toBe('₹0');
    expect(formatCurrency(5000, false)).toBe('5,000');
  });

  it('parses currency input cleanly', () => {
    expect(parseCurrencyInput('₹15,000.50')).toBe(15000.5);
    expect(parseCurrencyInput('')).toBe(0);
    expect(parseCurrencyInput('abc')).toBe(0);
  });

  it('validates HTTPS URLs and rejects non-https or invalid schemes', () => {
    expect(isValidHttpsUrl('https://meet.google.com/abc-defg-hij')).toBe(true);
    expect(isValidHttpsUrl('https://zoom.us/j/123456789')).toBe(true);
    expect(isValidHttpsUrl('http://insecure.com')).toBe(false);
    expect(isValidHttpsUrl('javascript:alert(1)')).toBe(false);
    expect(isValidHttpsUrl('')).toBe(false);
    expect(sanitizeUrl('https://meet.google.com/abc-defg-hij')).toBe('https://meet.google.com/abc-defg-hij');
    expect(sanitizeUrl('http://insecure.com')).toBe('');
  });

  it('truncates text with ellipsis and maps status badges to tones', () => {
    expect(truncateText('Hello World This Is Long', 10)).toBe('Hello Worl…');
    expect(truncateText('Short', 10)).toBe('Short');
    expect(formatStatusBadge('ACTIVE')).toEqual({ label: 'ACTIVE', tone: 'success' });
    expect(formatStatusBadge('OVERDUE')).toEqual({ label: 'OVERDUE', tone: 'danger' });
    expect(formatStatusBadge('PARTIALLY_PAID')).toEqual({ label: 'PARTIALLY PAID', tone: 'warning' });
  });
});
