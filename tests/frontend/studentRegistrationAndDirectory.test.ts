import { describe, it, expect } from 'vitest';
import { validateRegistrationForm } from '../../src/domains/students/registrationValidation';
import { formatStatusBadge } from '../../src/lib/textFormat';
import { RegistrationFormData } from '../../src/domains/students/registrationTypes';

describe('Student Registration and Directory Improvements', () => {
  describe('Registration Form Validation across 4 Sections', () => {
    it('requires student name, parent name, and parent phone', () => {
      const emptyForm: RegistrationFormData = {
        student: { student_name: '', subject: '', student_phone: '', student_email: '' },
        parent: { parent_name: '', parent_phone: '', parent_email: '' },
        pkg: { plan_type: 'Package', currency: 'INR', package_price: '', per_class: '', classes_purchased: '' },
        schedules: [],
      };

      const result = validateRegistrationForm(emptyForm);
      expect(result.isValid).toBe(false);
      expect(result.errors.student?.student_name).toBe('Student name is required.');
      expect(result.errors.parent?.parent_name).toBe('Parent name is required.');
      expect(result.errors.parent?.parent_phone).toBe('Parent phone is required.');
    });

    it('allows optional student email, phone, and parent email when valid', () => {
      const validForm: RegistrationFormData = {
        student: {
          student_name: 'Aditi Rao',
          subject: 'IB Chemistry HL',
          student_phone: '+91 98765 11111',
          student_email: 'aditi@example.com',
        },
        parent: {
          parent_name: 'Vikram Rao',
          parent_phone: '+91 98765 22222',
          parent_email: 'vikram@example.com',
        },
        pkg: {
          plan_type: 'Package',
          currency: 'INR',
          package_price: '20000',
          per_class: '1000',
          classes_purchased: '20',
        },
        schedules: [
          { id: '1', day_of_week: 'MONDAY', start_time: '16:00', end_time: '17:00' },
          { id: '2', day_of_week: 'THURSDAY', start_time: '18:30', end_time: '19:30' },
        ],
      };

      const result = validateRegistrationForm(validForm);
      expect(result.isValid).toBe(true);
      expect(result.errors.student).toBeUndefined();
      expect(result.errors.parent).toBeUndefined();
      expect(result.errors.pkg).toBeUndefined();
      expect(result.errors.schedules).toBeUndefined();
    });

    it('validates invalid emails and invalid package numbers', () => {
      const badForm: RegistrationFormData = {
        student: { student_name: 'Test', subject: '', student_phone: '', student_email: 'not-an-email' },
        parent: { parent_name: 'Parent', parent_phone: '1234567890', parent_email: 'bad-parent-email' },
        pkg: { plan_type: 'Package', currency: 'INR', package_price: '-500', per_class: '-10', classes_purchased: '2.5' },
        schedules: [],
      };

      const result = validateRegistrationForm(badForm);
      expect(result.isValid).toBe(false);
      expect(result.errors.student?.student_email).toContain('Invalid');
      expect(result.errors.parent?.parent_email).toContain('Invalid');
      expect(result.errors.pkg?.package_price).toBe('Package price must be a non-negative number.');
      expect(result.errors.pkg?.per_class).toBe('Per class rate must be a non-negative number.');
      expect(result.errors.pkg?.classes_purchased).toBe('Purchased classes must be a positive whole number.');
    });

    it('validates multiple schedule entries: time format and end > start', () => {
      const invalidScheduleForm: RegistrationFormData = {
        student: { student_name: 'Aarav', subject: '', student_phone: '', student_email: '' },
        parent: { parent_name: 'Sunita', parent_phone: '9876543210', parent_email: '' },
        pkg: { plan_type: 'Package', currency: 'INR', package_price: '', per_class: '', classes_purchased: '' },
        schedules: [
          { id: 's1', day_of_week: 'MONDAY', start_time: '18:00', end_time: '17:00' },
          { id: 's2', day_of_week: 'TUESDAY', start_time: 'invalid', end_time: '18:00' },
        ],
      };

      const result = validateRegistrationForm(invalidScheduleForm);
      expect(result.isValid).toBe(false);
      expect(result.errors.schedules?.['entry_s1_time']).toBe('End time must be after start time.');
      expect(result.errors.schedules?.['entry_s2_start']).toBe('Valid start time required (HH:MM).');
    });
  });

  describe('Directory Semantic Status Badges', () => {
    it('maps ACTIVE to success tone (green)', () => {
      const active = formatStatusBadge('ACTIVE');
      expect(active.label).toBe('ACTIVE');
      expect(active.tone).toBe('success');
    });

    it('maps INACTIVE to danger tone (red)', () => {
      const inactive = formatStatusBadge('INACTIVE');
      expect(inactive.label).toBe('INACTIVE');
      expect(inactive.tone).toBe('danger');
    });

    it('maps ARCHIVED to neutral tone (grey)', () => {
      const archived = formatStatusBadge('ARCHIVED');
      expect(archived.label).toBe('ARCHIVED');
      expect(archived.tone).toBe('neutral');
    });
  });
});
