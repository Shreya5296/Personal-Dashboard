import { describe, it, expect } from 'vitest';
import { ROUTE_CONFIGS } from '../../src/app/routeAccess';
import { validateStudentInput } from '../../src/domains/students/studentValidation';
import { formatStatusBadge } from '../../src/lib/textFormat';

describe('Frontend Product Screens & Routing Logic', () => {
  it('defines all documented product routes with admin protection', () => {
    const requiredSections = [
      'dashboard',
      'students',
      'fees',
      'classes',
      'meeting-links',
      'reports',
      'settings',
    ];

    for (const section of requiredSections) {
      const config = ROUTE_CONFIGS[section as keyof typeof ROUTE_CONFIGS];
      expect(config).toBeDefined();
      expect(config.title).toBeTruthy();
      expect(config.requiresAdmin).toBe(true);
    }

    // Verify retired imports route is not defined
    expect((ROUTE_CONFIGS as any)['imports']).toBeUndefined();
  });

  it('validates student creation form inputs accurately', () => {
    // Empty full name
    const invalidRes = validateStudentInput({ full_name: '' });
    expect(invalidRes.isValid).toBe(false);
    expect(invalidRes.errors.full_name).toContain('Full name is required');

    // Valid student
    const validRes = validateStudentInput({
      full_name: 'Ananya Roy',
      email: 'ananya@example.com',
      phone: '+91 9876543210',
    });
    expect(validRes.isValid).toBe(true);
    expect(Object.keys(validRes.errors)).toHaveLength(0);

    // Invalid email format
    const badEmail = validateStudentInput({
      full_name: 'Ananya Roy',
      email: 'not-an-email',
    });
    expect(badEmail.isValid).toBe(false);
    expect(badEmail.errors.email).toContain('Invalid email');
  });

  it('formats status tones for all lifecycle states across screens', () => {
    expect(formatStatusBadge('ACTIVE').tone).toBe('success');
    expect(formatStatusBadge('PAID').tone).toBe('success');
    expect(formatStatusBadge('ATTENDED').tone).toBe('success');
    expect(formatStatusBadge('PENDING').tone).toBe('warning');
    expect(formatStatusBadge('OVERDUE').tone).toBe('danger');
    expect(formatStatusBadge('VOID').tone).toBe('danger');
  });
});
