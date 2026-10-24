import { describe, it, expect } from 'vitest';
import {
  calculatePerClassRate,
  calculateProjectedLastClassDate,
  calculateRescheduledProjectedDate,
  calculateYearlyClassCount,
  calculateAnnualPackageMetrics,
} from '../../src/domains/packages/packageCalculations';

describe('packageCalculations', () => {
  describe('calculatePerClassRate', () => {
    it('calculates effective rate automatically', () => {
      expect(calculatePerClassRate(20000, 20)).toBe(1000);
      expect(calculatePerClassRate(15000, 10)).toBe(1500);
      expect(calculatePerClassRate(25000, 30)).toBe(833.33);
    });

    it('safely handles zero or missing class counts', () => {
      expect(calculatePerClassRate(20000, 0)).toBe(0);
      expect(calculatePerClassRate(0, 10)).toBe(0);
      expect(calculatePerClassRate('', '')).toBe(0);
      expect(calculatePerClassRate(undefined as unknown as number, 10)).toBe(0);
    });
  });

  describe('calculateProjectedLastClassDate', () => {
    it('calculates projected date for single recurring day per week', () => {
      // 2026-11-02 is a Monday. 4 Mondays: Nov 2, Nov 9, Nov 16, Nov 23
      const last = calculateProjectedLastClassDate('2026-11-02', ['MONDAY'], 4);
      expect(last).toBe('2026-11-23');
    });

    it('handles multiple recurring days per week', () => {
      // Monday and Thursday, 5 classes starting 2026-11-02:
      // 1: Mon Nov 2, 2: Thu Nov 5, 3: Mon Nov 9, 4: Thu Nov 12, 5: Mon Nov 16
      const last = calculateProjectedLastClassDate('2026-11-02', ['MONDAY', 'THURSDAY'], 5);
      expect(last).toBe('2026-11-16');
    });

    it('handles uneven weekly schedule and partway week ending', () => {
      // Tuesday, Thursday, Sunday (3/week). 7 classes starting Tuesday Nov 3, 2026:
      // 1: Tue Nov 3
      // 2: Thu Nov 5
      // 3: Sun Nov 8
      // 4: Tue Nov 10
      // 5: Thu Nov 12
      // 6: Sun Nov 15
      // 7: Tue Nov 17
      const last = calculateProjectedLastClassDate('2026-11-03', ['TUESDAY', 'THURSDAY', 'SUNDAY'], 7);
      expect(last).toBe('2026-11-17');
    });

    it('recalculates date when sessions are rescheduled or cancelled', () => {
      // If 3 sessions remain starting from Nov 10, 2026 on MONDAY, THURSDAY:
      // 1: Thu Nov 12, 2: Mon Nov 16, 3: Thu Nov 19
      const rescheduled = calculateRescheduledProjectedDate('2026-11-10', ['MONDAY', 'THURSDAY'], 3);
      expect(rescheduled).toBe('2026-11-19');
    });
  });

  describe('calculateYearlyClassCount', () => {
    it('derives yearly count from actual weekdays, not hardcoded 4 weeks per month', () => {
      // Mon & Wed from 2026-01-05 to 2026-12-30.
      // There are 52 Mondays and 52 Wednesdays in 2026 = 104 classes (not 4 * 12 * 2 = 96).
      const count = calculateYearlyClassCount('2026-01-05', '2026-12-30', ['MONDAY', 'WEDNESDAY'], 2026);
      expect(count).toBe(104);
      expect(count).not.toBe(96); // Distinguish from 4 weeks/month assumption
    });

    it('handles packages spanning across year boundaries', () => {
      // Starts 2026-10-01, ends 2027-03-31 on Fridays.
      // Fridays in 2026: Oct 2, 9, 16, 23, 30, Nov 6, 13, 20, 27, Dec 4, 11, 18, 25 (13 fridays in 2026)
      const count2026 = calculateYearlyClassCount('2026-10-01', '2027-03-31', ['FRIDAY'], 2026);
      expect(count2026).toBe(13);
    });
  });

  describe('calculateAnnualPackageMetrics', () => {
    it('calculates full metrics suite for annual package', () => {
      const metrics = calculateAnnualPackageMetrics({
        startDate: '2026-01-05',
        schedules: [{ day_of_week: 'MONDAY' }, { day_of_week: 'WEDNESDAY' }],
        classesPurchased: 104,
        packagePrice: 104000,
        targetYear: 2026,
      });

      expect(metrics.firstScheduledDate).toBe('2026-01-05');
      expect(metrics.projectedLastDate).toBe('2026-12-30');
      expect(metrics.yearlyClassCount).toBe(104);
      expect(metrics.totalClassesPurchased).toBe(104);
      expect(metrics.effectivePerClassRate).toBe(1000);
    });
  });
});
