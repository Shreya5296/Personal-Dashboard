import { Student } from './studentTypes';

export type StudentStatusTab = 'ALL' | 'ACTIVE' | 'INACTIVE';

export interface StudentBalanceClassification {
  totalPurchased: number;
  totalConsumed: number;
}

/**
 * Classifies whether a student is Active based on remaining classes and status.
 * Inactive rule: 0 remaining classes (or unpurchased/exhausted), or marked INACTIVE/ARCHIVED.
 * Active rule: Remaining classes > 0 and status is not INACTIVE or ARCHIVED.
 * Note: Inactive records are never deleted or modified in Google Sheets.
 */
export function isStudentActive(
  student: Student,
  balance?: StudentBalanceClassification
): boolean {
  if (student.status === 'ARCHIVED' || student.status === 'INACTIVE') {
    return false;
  }
  if (!balance) return true;
  const remaining = Math.max(0, (balance.totalPurchased || 0) - (balance.totalConsumed || 0));
  return remaining > 0;
}

export function filterStudentsByTab(
  students: Student[],
  tab: StudentStatusTab,
  getBalance: (studentId: string) => StudentBalanceClassification
): Student[] {
  if (tab === 'ALL') return students;
  return students.filter((s) => {
    const active = isStudentActive(s, getBalance(s.student_id));
    return tab === 'ACTIVE' ? active : !active;
  });
}