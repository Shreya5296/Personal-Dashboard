import { describe, it, expect } from 'vitest';
import {
  validatePaymentForm,
  resolveStudentPackageCurrency,
} from '../../src/domains/finances/paymentFormValidation';
import { Package } from '../../src/domains/packages/packageTypes';
import { toInputDateFormat } from '../../src/lib/dateFormat';
import { detectMeetingPlatform } from '../../src/domains/meeting-links/platformDetector';

describe('Finances Workflow & Meeting Links Redesign', () => {
  describe('Payment Form Validation & Currency Resolution', () => {
    it('validates required student selection, date, and positive amount', () => {
      const invalid = validatePaymentForm({
        student_id: '',
        payment_date: '',
        amount: '0',
        currency: 'INR',
        in_inr: '',
      });

      expect(invalid.isValid).toBe(false);
      expect(invalid.errors.student_id).toBe('Please select a student.');
      expect(invalid.errors.payment_date).toBe('Payment date is required.');
      expect(invalid.errors.amount).toBe('Amount must be greater than zero.');
    });

    it('accepts valid domestic INR payment without manual INR equivalent', () => {
      const valid = validatePaymentForm({
        student_id: 'stu_101',
        payment_date: '2026-10-24',
        amount: '5000',
        currency: 'INR',
        in_inr: '',
      });

      expect(valid.isValid).toBe(true);
      expect(Object.keys(valid.errors)).toHaveLength(0);
    });

    it('requires manual INR equivalent for foreign-currency payments without silent conversion', () => {
      const foreignWithoutInr = validatePaymentForm({
        student_id: 'stu_102',
        payment_date: '2026-10-24',
        amount: '150',
        currency: 'USD',
        in_inr: '',
      });

      expect(foreignWithoutInr.isValid).toBe(false);
      expect(foreignWithoutInr.errors.in_inr).toContain('Manual INR equivalent is required');

      const foreignWithInr = validatePaymentForm({
        student_id: 'stu_102',
        payment_date: '2026-10-24',
        amount: '150',
        currency: 'USD',
        in_inr: '12450',
      });

      expect(foreignWithInr.isValid).toBe(true);
      expect(Object.keys(foreignWithInr.errors)).toHaveLength(0);
    });

    it('resolves unambiguous package currency for a student', () => {
      const packages: Package[] = [
        {
          package_id: 'pkg_1',
          student_id: 'stu_usd',
          currency: 'USD',
          package_price: 500,
        },
        {
          package_id: 'pkg_2',
          student_id: 'stu_mixed_1',
          currency: 'USD',
          package_price: 300,
        },
        {
          package_id: 'pkg_3',
          student_id: 'stu_mixed_1',
          currency: 'GBP',
          package_price: 200,
        },
      ];

      expect(resolveStudentPackageCurrency('stu_usd', packages)).toBe('USD');
      expect(resolveStudentPackageCurrency('stu_mixed_1', packages)).toBe('INR');
      expect(resolveStudentPackageCurrency('stu_none', packages)).toBe('INR');
      expect(resolveStudentPackageCurrency('', packages)).toBe('INR');
    });

    it('formats today in application timezone (Asia/Kolkata)', () => {
      const todayString = toInputDateFormat(new Date(), 'Asia/Kolkata');
      expect(todayString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Meeting Links Table Platform Badging & Detection', () => {
    it('detects platforms accurately for compact table cells', () => {
      const gmeet = detectMeetingPlatform('https://meet.google.com/abc-xyz-123');
      expect(gmeet?.platform).toBe('GOOGLE_MEET');
      expect(gmeet?.label).toBe('Google Meet');

      const zoom = detectMeetingPlatform('https://zoom.us/j/987654321');
      expect(zoom?.platform).toBe('ZOOM');
      expect(zoom?.label).toBe('Zoom');

      const other = detectMeetingPlatform('https://custom-classroom.org/join');
      expect(other?.platform).toBe('OTHER');
      expect(other?.label).toBe('Other meeting platform');
    });
  });
});
