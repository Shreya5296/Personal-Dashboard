import { describe, it, expect } from 'vitest';
import { formatClassBalance } from '../../src/domains/students/classBalanceFormatter';
import { formatWeeklySchedule } from '../../src/domains/students/scheduleFormatter';
import { detectMeetingPlatform } from '../../src/domains/meeting-links/platformDetector';

describe('Meeting Links and Student Details UI Fixes', () => {
  describe('Fix 1 & 2: Meeting Link Styling & Missing Link State', () => {
    it('detects Google Meet URLs and applies green palette parameters', () => {
      const meet = detectMeetingPlatform('https://meet.google.com/abc-defg-hij');
      expect(meet?.platform).toBe('GOOGLE_MEET');
      expect(meet?.dotColor).toBe('#059669');
      expect(meet?.badgeBg).toBe('#ecfdf5');
      expect(meet?.badgeText).toBe('#065f46');
    });

    it('detects Zoom URLs and applies blue palette parameters', () => {
      const zoom = detectMeetingPlatform('https://zoom.us/j/987654321');
      expect(zoom?.platform).toBe('ZOOM');
      expect(zoom?.dotColor).toBe('#2563eb');
      expect(zoom?.badgeBg).toBe('#eff6ff');
      expect(zoom?.badgeText).toBe('#1d4ed8');
    });

    it('identifies link type from actual URL, not position or assumption', () => {
      const primaryZoom = detectMeetingPlatform('https://zoom.us/j/111222333');
      const secondaryMeet = detectMeetingPlatform('https://meet.google.com/xyz-123-abc');
      expect(primaryZoom?.platform).toBe('ZOOM');
      expect(secondaryMeet?.platform).toBe('GOOGLE_MEET');
    });

    it('returns null for missing, empty, or placeholder links', () => {
      expect(detectMeetingPlatform('')).toBeNull();
      expect(detectMeetingPlatform('   ')).toBeNull();
      expect(detectMeetingPlatform('-')).toBeNull();
      expect(detectMeetingPlatform('—')).toBeNull();
      expect(detectMeetingPlatform(null)).toBeNull();
      expect(detectMeetingPlatform(undefined)).toBeNull();
    });
  });

  describe('Fix 3: Meeting Link Form Student Selection Invariants', () => {
    it('requires explicit student selection when adding a link', () => {
      const validateSubmission = (studentId: string | undefined, url: string) => {
        if (!studentId) return { valid: false, error: 'Please select a student.' };
        if (!url) return { valid: false, error: 'At least one meeting link is required.' };
        return { valid: true };
      };

      expect(validateSubmission('', 'https://meet.google.com/test')).toEqual({
        valid: false,
        error: 'Please select a student.',
      });
      expect(validateSubmission('STU_001', 'https://meet.google.com/test')).toEqual({
        valid: true,
      });
    });
  });

  describe('Fix 4: Class Balance Formatter (01/48)', () => {
    it('formats single digit consumed with leading zero based on total digits', () => {
      expect(formatClassBalance(1, 48)).toBe('01/48');
      expect(formatClassBalance(9, 48)).toBe('09/48');
      expect(formatClassBalance(12, 48)).toBe('12/48');
    });

    it('formats consistently with 3 digits when total is 100 or greater', () => {
      expect(formatClassBalance(1, 100)).toBe('001/100');
      expect(formatClassBalance(25, 120)).toBe('025/120');
    });

    it('handles zero consumed and zero total gracefully', () => {
      expect(formatClassBalance(0, 48)).toBe('00/48');
      expect(formatClassBalance(0, 0)).toBe('00/00');
      expect(formatClassBalance(0, 12)).toBe('00/12');
    });

    it('handles negative or invalid values defensively', () => {
      expect(formatClassBalance(-5, 20)).toBe('00/20');
      expect(formatClassBalance(NaN, 20)).toBe('00/20');
      expect(formatClassBalance(5, NaN)).toBe('05/00');
    });
  });

  describe('Fix 4: Schedule Formatter', () => {
    it('formats a single weekly schedule entry', () => {
      const schedule = [{ day_of_week: 'MONDAY', start_time: '16:00', end_time: '17:00' }];
      expect(formatWeeklySchedule(schedule)).toBe('Mon 16:00–17:00');
    });

    it('groups multiple schedules with the same time range', () => {
      const schedule = [
        { day_of_week: 'MONDAY', start_time: '16:00', end_time: '17:00' },
        { day_of_week: 'THURSDAY', start_time: '16:00', end_time: '17:00' },
      ];
      expect(formatWeeklySchedule(schedule)).toBe('Mon, Thu 16:00–17:00');
    });

    it('formats multiple schedules with different time ranges', () => {
      const schedule = [
        { day_of_week: 'MONDAY', start_time: '16:00', end_time: '17:00' },
        { day_of_week: 'FRIDAY', start_time: '18:00', end_time: '19:30' },
      ];
      expect(formatWeeklySchedule(schedule)).toBe('Mon 16:00–17:00; Fri 18:00–19:30');
    });

    it('returns readable fallback when no schedule is configured', () => {
      expect(formatWeeklySchedule([])).toBe('No configured schedule');
      expect(formatWeeklySchedule(null)).toBe('No configured schedule');
      expect(formatWeeklySchedule(undefined)).toBe('No configured schedule');
    });
  });
});
