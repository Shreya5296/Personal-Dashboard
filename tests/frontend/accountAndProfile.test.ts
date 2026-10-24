import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSavedDisplayName,
  saveDisplayName,
  clearSavedDisplayName,
  resolveDisplayName,
} from '../../src/auth/userProfileStorage';
import {
  getSavedTimezone,
  saveTimezone,
  getSavedCurrency,
  saveCurrency,
  DEFAULT_TIMEZONE,
  DEFAULT_CURRENCY,
} from '../../src/lib/userPreferences';
import { formatCurrency } from '../../src/lib/currencyFormat';
import { formatDateTime } from '../../src/lib/dateFormat';
import { ROUTE_CONFIGS } from '../../src/app/routeAccess';

describe('Account Dropdown, Profile & Regional Preferences Logic', () => {
  beforeEach(() => {
    clearSavedDisplayName();
    saveTimezone(DEFAULT_TIMEZONE);
    saveCurrency(DEFAULT_CURRENCY);
  });

  it('resolves email local part when name is Administrator and none is saved', () => {
    const resolved = resolveDisplayName('Administrator', 'ashreya0502@gmail.com');
    expect(resolved).toBe('ashreya0502');
  });

  it('preserves non-Administrator candidate name when no name is saved in storage', () => {
    const resolved = resolveDisplayName('Shreya Admin', 'ashreya0502@gmail.com');
    expect(resolved).toBe('Shreya Admin');
  });

  it('persists and retrieves saved display name across subsequent calls', () => {
    expect(getSavedDisplayName()).toBeNull();
    saveDisplayName('Ashreya Sharma');
    expect(getSavedDisplayName()).toBe('Ashreya Sharma');

    const resolved = resolveDisplayName('Administrator', 'ashreya0502@gmail.com');
    expect(resolved).toBe('Ashreya Sharma');
  });

  it('persists timezone preference and formats dates accordingly', () => {
    expect(getSavedTimezone()).toBe('Asia/Kolkata');
    const isoInstant = '2026-10-24T10:00:00.000Z'; // 15:30 IST, 06:00 EDT
    expect(formatDateTime(isoInstant)).toContain('03:30 pm');

    saveTimezone('America/New_York');
    expect(getSavedTimezone()).toBe('America/New_York');
    expect(formatDateTime(isoInstant)).toContain('06:00 am');
  });

  it('persists currency preference and formats monetary amounts accordingly', () => {
    expect(getSavedCurrency()).toBe('INR');
    expect(formatCurrency(5000)).toBe('₹5,000');

    saveCurrency('USD');
    expect(getSavedCurrency()).toBe('USD');
    expect(formatCurrency(5000)).toBe('$5,000');

    // Overridden currency preserves original currency
    expect(formatCurrency(1500, true, 'GBP')).toBe('£1,500');
  });

  it('retains route configuration for settings as Profile & Preferences', () => {
    const settingsRoute = ROUTE_CONFIGS.settings;
    expect(settingsRoute).toBeDefined();
    expect(settingsRoute.title).toBe('Profile & Preferences');
    expect(settingsRoute.requiresAdmin).toBe(true);
  });

  it('renames reports route title to Earnings Overview', () => {
    const reportsRoute = ROUTE_CONFIGS.reports;
    expect(reportsRoute).toBeDefined();
    expect(reportsRoute.title).toBe('Earnings Overview');
    expect(reportsRoute.requiresAdmin).toBe(true);
  });
});
