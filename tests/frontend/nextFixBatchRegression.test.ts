import { describe, it, expect, vi } from 'vitest';
import {
  calculatePerClassRate,
  calculateProjectedLastClassDate,
  calculateRescheduledProjectedDate,
  calculateYearlyClassCount,
} from '../../src/domains/packages/packageCalculations';
import { formatOutstandingBalance } from '../../src/lib/balanceFormat';
import { generateProposedSessions } from '../../src/domains/classes/classGenerator';
import {
  subscribeScheduleProgress,
  startAsyncScheduling,
} from '../../src/domains/students/asyncScheduleWorker';

describe('Next Fix Batch Regression Tests', () => {
  describe('1 & 2. Package Calculations & Automatic Derivations', () => {
    it('calculates effective per-class price automatically', () => {
      expect(calculatePerClassRate(30000, 20)).toBe(1500);
      expect(calculatePerClassRate(10000, 3)).toBe(3333.33);
      expect(calculatePerClassRate(0, 10)).toBe(0);
      expect(calculatePerClassRate(10000, 0)).toBe(0);
    });

    it('calculates projected last class date for multiple recurring days per week', () => {
      // 2026-11-02 is Monday. 6 classes on Mon & Thu:
      // Nov 2, Nov 5, Nov 9, Nov 12, Nov 16, Nov 19
      const lastDate = calculateProjectedLastClassDate('2026-11-02', ['MONDAY', 'THURSDAY'], 6);
      expect(lastDate).toBe('2026-11-19');
    });

    it('recalculates projected last class date after rescheduling or cancellations', () => {
      // 4 remaining classes on Tue & Fri starting 2026-11-10:
      // Nov 10, Nov 13, Nov 17, Nov 20
      const rescheduled = calculateRescheduledProjectedDate('2026-11-10', ['TUESDAY', 'FRIDAY'], 4);
      expect(rescheduled).toBe('2026-11-20');
    });

    it('derives yearly class count from actual configured weekdays, not hardcoded 4 weeks/month', () => {
      // 52 Mondays in 2026
      const count = calculateYearlyClassCount('2026-01-05', '2026-12-28', ['MONDAY'], 2026);
      expect(count).toBe(52);
      expect(count).not.toBe(48);
    });
  });

  describe('12. Outstanding Balance & NIL Representation', () => {
    it('displays NIL in neutral grey for zero outstanding balance', () => {
      const res = formatOutstandingBalance(0);
      expect(res.text).toBe('NIL');
      expect(res.color).toBe('#64748b');
      expect(res.isNil).toBe(true);
      expect(res.isUnknown).toBe(false);
    });

    it('displays debt in red for positive outstanding balance', () => {
      const res = formatOutstandingBalance(5000);
      expect(res.text).toContain('5,000');
      expect(res.color).toBe('#dc2626');
      expect(res.isNil).toBe(false);
      expect(res.isUnknown).toBe(false);
    });

    it('distinguishes unknown/missing balances from NIL', () => {
      const resNull = formatOutstandingBalance(null);
      expect(resNull.text).toBe('—');
      expect(resNull.isNil).toBe(false);
      expect(resNull.isUnknown).toBe(true);

      const resUndef = formatOutstandingBalance(undefined);
      expect(resUndef.text).toBe('—');
      expect(resUndef.isNil).toBe(false);
      expect(resUndef.isUnknown).toBe(true);
    });
  });

  describe('10. Prevent Scheduling Conflicts and Interval Overlaps', () => {
    it('detects overlapping time intervals and allows adjacent touching intervals', () => {
      const existing = [{
        session_id: 'cls_001',
        student_id: 'STU_001',
        scheduled_start: '2026-11-02T16:00:00.000Z',
        scheduled_end: '2026-11-02T17:00:00.000Z',
        start_time: '2026-11-02T16:00:00.000Z',
        duration_minutes: 60,
        status: 'SCHEDULED',
      }];

      // 1. Overlapping session (16:30 - 17:30)
      const overlapping = generateProposedSessions(
        [{ day_of_week: 'MONDAY', start_time: '16:30', end_time: '17:30' }],
        '2026-11-02', 1, existing, 'STU_002', 60
      );
      expect(overlapping[0].hasConflict).toBe(true);
      expect(overlapping[0].conflictDetails).toContain('overlaps');

      // 2. Adjacent session starting exactly when previous ends (17:00 - 18:00) => ALLOWED!
      const adjacent = generateProposedSessions(
        [{ day_of_week: 'MONDAY', start_time: '17:00', end_time: '18:00' }],
        '2026-11-02', 1, existing, 'STU_002', 60
      );
      expect(adjacent[0].hasConflict).toBe(false);
    });

    it('ignores cancelled sessions when checking for conflicts', () => {
      const existingCancelled = [{
        session_id: 'cls_002',
        student_id: 'STU_001',
        scheduled_start: '2026-11-02T16:00:00.000Z',
        scheduled_end: '2026-11-02T17:00:00.000Z',
        start_time: '2026-11-02T16:00:00.000Z',
        duration_minutes: 60,
        status: 'CANCELLED',
      }];

      const proposed = generateProposedSessions(
        [{ day_of_week: 'MONDAY', start_time: '16:00', end_time: '17:00' }],
        '2026-11-02', 1, existingCancelled, 'STU_002', 60
      );
      expect(proposed[0].hasConflict).toBe(false);
    });
  });

  describe('3. Asynchronous Scheduling & Progress', () => {
    it('subscribes to schedule progress notifications and updates state', async () => {
      const listener = vi.fn();
      const unsub = subscribeScheduleProgress(listener);

      await startAsyncScheduling({
        studentId: 'STU_001',
        studentName: 'Aarav Sharma',
        firstClassDate: '2026-11-02',
        schedules: [{ day_of_week: 'MONDAY', start_time: '16:00', end_time: '17:00' }],
        classesPurchased: 2,
      });

      expect(listener).toHaveBeenCalled();
      const lastCall = listener.mock.calls[listener.mock.calls.length - 1][0];
      expect(lastCall.studentName).toBe('Aarav Sharma');
      unsub();
    });
  });
});
