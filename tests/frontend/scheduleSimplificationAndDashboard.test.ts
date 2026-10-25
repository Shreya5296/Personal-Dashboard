import { describe, it, expect } from 'vitest';
import { validateRegistrationForm } from '../../src/domains/students/registrationValidation';
import { RegistrationFormData } from '../../src/domains/students/registrationTypes';
import { generateAttentionAlerts } from '../../src/domains/dashboard/attentionAlerts';
import { Student } from '../../src/domains/students/studentTypes';
import { WeeklyScheduleEntry } from '../../src/domains/classes/scheduleApi';

describe('Schedule Simplification & Dashboard Reorganization', () => {
  describe('1. First Class Date Validation', () => {
    const baseForm: RegistrationFormData = {
      student: { student_name: 'Ananya Sharma', subject: 'Math', student_phone: '', student_email: '' },
      parent: { parent_name: 'Rohit Sharma', parent_phone: '+91 99999 88888', parent_email: 'rohit@example.com' },
      pkg: { plan_type: 'Package', currency: 'INR', package_price: '20000', per_class: '1000', classes_purchased: '20', class_duration: '60' },
      schedules: [
        { id: '1', day_of_week: 'MONDAY', start_time: '17:00', end_time: '18:00' },
      ],
      first_class_date: '',
    };

    it('rejects registration when first class date is missing', () => {
      const res = validateRegistrationForm({ ...baseForm, first_class_date: '' });
      expect(res.isValid).toBe(false);
      expect(res.errors.first_class_date).toBe('First class date is required.');
    });

    it('rejects registration when first class date is in the past', () => {
      const res = validateRegistrationForm({ ...baseForm, first_class_date: '2020-01-01' });
      expect(res.isValid).toBe(false);
      expect(res.errors.first_class_date).toBe('First class date cannot be in the past.');
    });

    it('rejects when first class date does not match configured recurring schedule weekday', () => {
      // 2026-11-03 is Tuesday, but configured day is MONDAY
      const res = validateRegistrationForm({ ...baseForm, first_class_date: '2026-11-03' });
      expect(res.isValid).toBe(false);
      expect(res.errors.first_class_date).toContain('configured recurring days are MONDAY');
    });

    it('accepts valid future first class date matching configured recurring weekday', () => {
      // 2026-11-02 is Monday
      const res = validateRegistrationForm({ ...baseForm, first_class_date: '2026-11-02' });
      expect(res.isValid).toBe(true);
      expect(res.errors.first_class_date).toBeUndefined();
    });
  });

  describe('2. Missing Meeting Link Attention Alerts', () => {
    const activeStudent: Student = {
      student_id: 'stu_101',
      student_name: 'Kabir Verma',
      status: 'ACTIVE',
      parent_name: 'Meera Verma',
      parent_phone: '9876543210',
      parent_email: 'meera@example.com',
      student_phone: '',
      student_email: '',
      subject: 'Science',
    };

    const schedule: WeeklyScheduleEntry = {
      schedule_id: 'sch_1',
      student_id: 'stu_101',
      day_of_week: 'MONDAY',
      start_time: '17:00',
      end_time: '18:00',
      is_active: true,
    };

    it('generates attention alert with exact issue "Meeting link not configured"', () => {
      const alerts = generateAttentionAlerts({
        students: [activeStudent],
        schedules: [schedule],
        meetingLinks: [], // No meeting links
        packages: [{ package_id: 'pkg_1', student_id: 'stu_101', classes_purchased: 10, consumed_classes: 2 }],
      });

      const linkAlert = alerts.find((a) => a.studentId === 'stu_101' && a.targetSection === 'meeting-links');
      expect(linkAlert).toBeDefined();
      expect(linkAlert?.reason).toBe('Meeting link not configured');
      expect(linkAlert?.actionLabel).toBe('Configure Link');
      expect(linkAlert?.severity).toBe('warning');
    });

    it('clears attention alert once valid meeting link is provided', () => {
      const alerts = generateAttentionAlerts({
        students: [activeStudent],
        schedules: [schedule],
        meetingLinks: [{
          student_id: 'stu_101',
          student_name: 'Kabir Verma',
          meeting_link_1: 'https://meet.google.com/xyz-abcd-efg',
        }],
        packages: [{ package_id: 'pkg_1', student_id: 'stu_101', classes_purchased: 10, consumed_classes: 2 }],
      });

      const linkAlert = alerts.find((a) => a.studentId === 'stu_101' && a.targetSection === 'meeting-links');
      expect(linkAlert).toBeUndefined();
    });
  });
});
