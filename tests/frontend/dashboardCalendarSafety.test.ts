import { describe, it, expect } from 'vitest';
import { formatTimeOnly, formatDate, formatDateTime } from '../../src/lib/dateFormat';

describe('Dashboard Calendar & Date Format Safety', () => {
  it('safely parses and formats ISO date strings with space-padded single-digit hours', () => {
    // Real data pattern seen from Google Sheets / Apps Script: "2026-10-24T 4:38:00.000Z"
    const rawDate = '2026-10-24T 4:38:00.000Z';

    const formattedTime = formatTimeOnly(rawDate, 'Asia/Kolkata');
    expect(formattedTime).not.toBe('—');
    expect(formattedTime).toMatch(/\d{1,2}:\d{2}\s+(AM|PM)/i);

    const formattedDate = formatDate(rawDate, 'Asia/Kolkata');
    expect(formattedDate).not.toBe('—');
    expect(formattedDate).toContain('2026');

    const formattedDateTime = formatDateTime(rawDate, 'Asia/Kolkata');
    expect(formattedDateTime).not.toBe('—');
  });

  it('safely handles completely invalid date strings without throwing RangeError', () => {
    const invalidInputs = ['not-a-date', '2026-99-99', '', null, undefined, 'Invalid Date'];

    for (const input of invalidInputs) {
      expect(() => formatTimeOnly(input as string)).not.toThrow();
      expect(formatTimeOnly(input as string)).toBe('—');

      expect(() => formatDate(input as string)).not.toThrow();
      expect(formatDate(input as string)).toBe('—');

      expect(() => formatDateTime(input as string)).not.toThrow();
      expect(formatDateTime(input as string)).toBe('—');
    }
  });
});
