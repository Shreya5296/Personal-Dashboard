/**
 * Pure calculation utilities for packages, rates, projected dates, and yearly counts.
 */

const DAY_MAP: Record<string, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};

export function calculatePerClassRate(price: number | string, classes: number | string): number {
  const p = Number(price);
  const c = Number(classes);
  if (!p || !c || c <= 0 || p <= 0 || isNaN(p) || isNaN(c)) return 0;
  return Math.round((p / c) * 100) / 100;
}

export interface PackageCalculatedDates {
  startDate: string;
  endDate: string;
  nextDueDate: string;
}

export function generatePackageOccurrences(
  startDateStr: string,
  recurringDays: string[],
  count: number
): string[] {
  if (!startDateStr || !recurringDays.length || count <= 0) return [];
  const days = recurringDays.map((d) => DAY_MAP[d.trim().toUpperCase()]).filter((d) => d !== undefined);
  if (!days.length) return [];
  const [y, m, d] = startDateStr.split('-').map(Number);
  if (!y || !m || !d) return [];

  const curr = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const occurrences: string[] = [];
  let safetyDays = 0;
  const maxDays = 365 * 4;

  while (occurrences.length < count && safetyDays < maxDays) {
    if (days.includes(curr.getUTCDay())) {
      const cy = curr.getUTCFullYear();
      const cm = String(curr.getUTCMonth() + 1).padStart(2, '0');
      const cd = String(curr.getUTCDate()).padStart(2, '0');
      occurrences.push(`${cy}-${cm}-${cd}`);
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
    safetyDays++;
  }
  return occurrences;
}

export function calculatePackageDates(
  startDateStr: string,
  recurringDays: string[],
  totalClasses: number
): PackageCalculatedDates {
  const occ = generatePackageOccurrences(startDateStr, recurringDays, totalClasses);
  if (!occ.length) return { startDate: startDateStr || '', endDate: '', nextDueDate: '' };
  // Next due date: 4 classes remain through final occurrence (e.g. 44th for 48-class pkg)
  const targetDueIdx = Math.max(0, occ.length - 5);
  return {
    startDate: occ[0],
    endDate: occ[occ.length - 1],
    nextDueDate: occ[targetDueIdx],
  };
}

export function calculateProjectedLastClassDate(
  startDateStr: string,
  recurringDays: string[],
  totalClasses: number
): string {
  const occ = generatePackageOccurrences(startDateStr, recurringDays, totalClasses);
  return occ.length ? occ[occ.length - 1] : '';
}

export function calculateRescheduledProjectedDate(
  fromDateStr: string,
  recurringDays: string[],
  remainingSessions: number
): string {
  return calculateProjectedLastClassDate(fromDateStr, recurringDays, remainingSessions);
}

export function calculateYearlyClassCount(
  startDateStr: string,
  lastDateStr: string,
  recurringDays: string[],
  targetYear?: number
): number {
  if (!startDateStr || !lastDateStr || !recurringDays.length) return 0;
  const days = recurringDays.map((d) => DAY_MAP[d.trim().toUpperCase()]).filter((d) => d !== undefined);
  if (!days.length) return 0;

  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = lastDateStr.split('-').map(Number);
  if (!sy || !ey) return 0;

  const year = targetYear || sy;
  const start = new Date(Date.UTC(sy, sm - 1, sd, 12, 0, 0));
  const end = new Date(Date.UTC(ey, em - 1, ed, 12, 0, 0));

  let count = 0;
  const curr = new Date(start);
  while (curr <= end) {
    if (curr.getUTCFullYear() === year) {
      if (days.includes(curr.getUTCDay())) {
        count++;
      }
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return count;
}

export interface AnnualPackageMetrics {
  firstScheduledDate: string;
  projectedLastDate: string;
  yearlyClassCount: number;
  totalClassesPurchased: number;
  effectivePerClassRate: number;
}

export function calculateAnnualPackageMetrics(params: {
  startDate: string;
  schedules: Array<{ day_of_week: string }>;
  classesPurchased: number | string;
  packagePrice: number | string;
  targetYear?: number;
}): AnnualPackageMetrics {
  const days = params.schedules.map((s) => s.day_of_week);
  const total = Number(params.classesPurchased) || 0;
  const price = Number(params.packagePrice) || 0;
  const effectivePerClassRate = calculatePerClassRate(price, total);
  const projectedLastDate = calculateProjectedLastClassDate(params.startDate, days, total);
  const yearlyClassCount = calculateYearlyClassCount(params.startDate, projectedLastDate, days, params.targetYear);

  return {
    firstScheduledDate: params.startDate,
    projectedLastDate,
    yearlyClassCount,
    totalClassesPurchased: total,
    effectivePerClassRate,
  };
}
