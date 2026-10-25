import { describe, it, expect } from 'vitest';
import {
  isYearlyPackage,
  calculateYearlyOccurrencesCount,
  getYearlyOccurrenceDates,
} from '../../src/domains/packages/yearlyPackageCalculations';
import { WeeklyScheduleEntry } from '../../src/domains/classes/scheduleApi';

describe('Fix 2 — Yearly Package Class Calculations', () => {
  it('correctly identifies yearly plan types', () => {
    expect(isYearlyPackage('Yearly')).toBe(true);
    expect(isYearlyPackage('YEARLY')).toBe(true);
    expect(isYearlyPackage('Yearly Package')).toBe(true);
    expect(isYearlyPackage('Monthly')).toBe(false);
    expect(isYearlyPackage('Per Class')).toBe(false);
    expect(isYearlyPackage(undefined)).toBe(false);
  });

  it('calculates class count accurately for 1 class per week over 1 full year', () => {
    // 2026-01-01 (Thursday) to 2026-12-31 (Thursday): 53 Thursdays in 2026
    const schedules: WeeklyScheduleEntry[] = [
      { id: '1', day_of_week: 'THURSDAY', start_time: '18:00', end_time: '19:00' },
    ];
    const count = calculateYearlyOccurrencesCount('2026-01-01', '2026-12-31', schedules);
    expect(count).toBe(53);

    const dates = getYearlyOccurrenceDates('2026-01-01', '2026-12-31', schedules);
    expect(dates).toHaveLength(53);
    expect(dates[0].date).toBe('2026-01-01');
    expect(dates[52].date).toBe('2026-12-31');
  });

  it('calculates class count accurately for 3 classes per week', () => {
    // Monday, Wednesday, Saturday from 2026-01-19 to 2026-05-10
    const schedules: WeeklyScheduleEntry[] = [
      { id: '1', day_of_week: 'MONDAY', start_time: '18:00', end_time: '18:30' },
      { id: '2', day_of_week: 'WEDNESDAY', start_time: '18:00', end_time: '18:30' },
      { id: '3', day_of_week: 'SATURDAY', start_time: '10:00', end_time: '10:30' },
    ];
    // 16 weeks * 3 = 48 classes
    const count = calculateYearlyOccurrencesCount('2026-01-19', '2026-05-09', schedules);
    expect(count).toBe(48);
  });

  it('supports multiple class entries on the same weekday', () => {
    // Two classes on Monday (morning & evening)
    const schedules: WeeklyScheduleEntry[] = [
      { id: '1', day_of_week: 'MONDAY', start_time: '10:00', end_time: '11:00' },
      { id: '2', day_of_week: 'MONDAY', start_time: '18:00', end_time: '19:00' },
    ];
    // In 4 weeks (28 days): 4 Mondays -> 8 classes
    const count = calculateYearlyOccurrencesCount('2026-02-02', '2026-03-01', schedules);
    expect(count).toBe(8);
  });

  it('handles leap years seamlessly (e.g. 2024, 2028)', () => {
    // 2024 is a leap year; Feb has 29 days
    const schedules: WeeklyScheduleEntry[] = [
      { id: '1', day_of_week: 'THURSDAY', start_time: '16:00', end_time: '17:00' },
    ];
    // 2024-02-29 is a Thursday!
    const count = calculateYearlyOccurrencesCount('2024-02-01', '2024-02-29', schedules);
    expect(count).toBe(5); // Feb 1, 8, 15, 22, 29
  });

  it('returns 0 when start date is after end date or schedules are empty', () => {
    expect(calculateYearlyOccurrencesCount('2026-12-31', '2026-01-01', [{ id: '1', day_of_week: 'MONDAY' }])).toBe(0);
    expect(calculateYearlyOccurrencesCount('2026-01-01', '2026-12-31', [])).toBe(0);
  });
});
