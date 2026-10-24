import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSavedDisplayName,
  saveDisplayName,
  clearSavedDisplayName,
  resolveDisplayName,
} from '../../src/auth/userProfileStorage';
import { ROUTE_CONFIGS } from '../../src/app/routeAccess';

describe('Account Dropdown & Profile Persistence Logic', () => {
  beforeEach(() => {
    clearSavedDisplayName();
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

  it('retains route configuration for settings as Profile & Preferences', () => {
    const settingsRoute = ROUTE_CONFIGS.settings;
    expect(settingsRoute).toBeDefined();
    expect(settingsRoute.title).toBe('Profile & Preferences');
    expect(settingsRoute.requiresAdmin).toBe(true);
  });
});
