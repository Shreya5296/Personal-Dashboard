import { Student } from './studentTypes';
import { ClassSession } from '../classes/classTypes';
import { getDateKeyInTz } from '../dashboard/calendarEventGenerator';

export type StudentStatusTab = 'ALL' | 'ACTIVE' | 'INACTIVE';

export interface StudentBalanceClassification {
  totalPurchased: number;
  totalConsumed: number;
}

export interface StudentStatusOptions {
  balance?: StudentBalanceClassification;
  lastCompletedDate?: string | null;
  referenceDateStr?: string;
}

/**
 * Calculates date 1 calendar month before reference date with month-end clamping.
 */
export function calculateOneCalendarMonthBefore(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetYear = m === 1 ? y - 1 : y;
  const targetMonth = m === 1 ? 12 : m - 1;
  const maxDays = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const targetDay = Math.min(d, maxDays);
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

/**
 * Returns latest completed class date in active timezone, or null if 0 completed classes.
 */
export function getLatestCompletedClassDate(
  sessions: ClassSession[] = [],
  studentId: string,
  activeTz = 'Asia/Kolkata'
): string | null {
  const completed = sessions.filter(
    (s) => s.student_id === studentId && (s.session_status || s.status || '').toUpperCase() === 'COMPLETED'
  );
  if (completed.length === 0) return null;

  let latestDate = '';
  for (const s of completed) {
    let dKey = s.schedule_date || s.class_date || '';
    if (!dKey) {
      const raw = s.scheduled_start || s.start_time;
      if (raw) {
        const parsed = new Date(String(raw).trim().replace(/T\s+(\d:)/, 'T0$1'));
        if (!isNaN(parsed.getTime())) dKey = getDateKeyInTz(parsed, activeTz);
      }
    }
    if (dKey && (!latestDate || dKey > latestDate)) {
      latestDate = dKey;
    }
  }
  return latestDate || null;
}

/**
 * Classifies whether a student is Active:
 * 1. Explicit ARCHIVED or INACTIVE -> false.
 * 2. 0 remaining classes (if balance provided) -> false.
 * 3. Last completed class >= 1 calendar month ago -> false.
 * 4. Students with 0 completed classes remain active.
 */
export function isStudentActive(
  student: Student,
  options?: StudentBalanceClassification | StudentStatusOptions
): boolean {
  const statusUpper = (student.status || '').trim().toUpperCase();
  if (statusUpper === 'ARCHIVED' || statusUpper === 'INACTIVE') {
    return false;
  }

  const balance = options && 'totalPurchased' in options ? options : (options as StudentStatusOptions)?.balance;
  if (balance) {
    const remaining = Math.max(0, (balance.totalPurchased || 0) - (balance.totalConsumed || 0));
    if (balance.totalPurchased > 0 && remaining <= 0) {
      return false;
    }
  }

  const statusOpts = options && !('totalPurchased' in options) ? (options as StudentStatusOptions) : undefined;
  if (statusOpts && statusOpts.lastCompletedDate !== undefined) {
    if (statusOpts.lastCompletedDate === null) {
      return true; // 0 completed classes -> remains active
    }
    const ref = statusOpts.referenceDateStr || new Date().toISOString().slice(0, 10);
    const threshold = calculateOneCalendarMonthBefore(ref);
    if (statusOpts.lastCompletedDate < threshold) {
      return false; // inactive: last completed >= 1 calendar month ago
    }
  }

  return true;
}

export function filterStudentsByTab(
  students: Student[],
  tab: StudentStatusTab,
  getBalance?: (studentId: string) => StudentBalanceClassification,
  _getLastCompleted?: (studentId: string) => string | null
): Student[] {
  if (tab === 'ALL') return students;
  return students.filter((s) => {
    const bal = getBalance ? getBalance(s.student_id) : undefined;
    // Canonical ACTIVE students remain in Active; never moved to Inactive due to last-class age
    const active = isStudentActive(s, bal ? { balance: bal } : undefined);
    return tab === 'ACTIVE' ? active : !active;
  });
}
