import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Sidebar } from '../../src/layout/Sidebar';

vi.mock('../../src/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: { email: 'admin@infineo.io', name: 'Shreya Admin' },
    signOut: vi.fn(),
  }),
}));

describe('Sidebar Icons & Accessibility', () => {
  it('renders Settings and Logout actions as icon buttons with accessible aria labels and titles', () => {
    const html = renderToString(
      React.createElement(Sidebar, {
        activeSection: 'dashboard',
        onNavigate: vi.fn(),
      })
    );

    // Settings icon button checks (checking both plain and HTML-encoded variants)
    expect(html).toMatch(/aria-label="Settings (&amp;|&) Regional Preferences"/);
    expect(html).toMatch(/title="Settings (&amp;|&) Regional Preferences"/);

    // Logout icon button checks
    expect(html).toContain('aria-label="Log out of session"');
    expect(html).toContain('title="Log out of session"');

    // Verifies SVG icon elements are rendered
    expect(html).toContain('<svg');
    expect(html).toContain('viewBox="0 0 24 24"');

    // Verifies neither button has raw inner text (icon replaced text)
    expect(html).not.toMatch(/>\s*Settings\s*<\/button>/i);
    expect(html).not.toMatch(/>\s*Logout\s*<\/button>/i);
  });

  it('applies active styling when activeSection is settings', () => {
    const activeHtml = renderToString(
      React.createElement(Sidebar, {
        activeSection: 'settings',
        onNavigate: vi.fn(),
      })
    );

    expect(activeHtml).toContain('settingsActionActive');

    const inactiveHtml = renderToString(
      React.createElement(Sidebar, {
        activeSection: 'calendar',
        onNavigate: vi.fn(),
      })
    );

    expect(inactiveHtml).not.toContain('settingsActionActive');
  });

  it('renders user details and navigation correctly alongside action icons', () => {
    const html = renderToString(
      React.createElement(Sidebar, {
        activeSection: 'students',
        onNavigate: vi.fn(),
      })
    );

    expect(html).toContain('Shreya Admin');
    expect(html).toContain('admin@infineo.io');
    expect(html).toContain('Students');
    expect(html).toContain('Calendar');
  });
});
