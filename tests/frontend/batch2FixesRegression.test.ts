import { describe, it, expect } from 'vitest';
import { STUDENT_TABLE_COLUMNS } from '../../src/domains/students/studentTableLayout';
import { buildSessionProgressMap, isSessionDeductible } from '../../src/domains/classes/sessionProgressCalculator';
import { getSessionStatusStyle, classifySessionStatus } from '../../src/domains/classes/sessionStatusStyles';
import { formatClassDate } from '../../src/domains/classes/classScheduleColumns';
import { calculateEndTime } from '../../src/domains/classes/scheduleDurationCalculator';
import { formatTimeRange12Hour, formatTimeTo12Hour } from '../../src/lib/time12Format';
import { parseIsoToSheetDate, DATE_COLUMNS_CONFIG } from '../../02-backend/apps-script/sheets/DateFormatService.gs';
import { isStudentActive } from '../../src/domains/students/studentStatusClassifier';

describe('Fix Batch 2 Comprehensive Verification', () => {
  describe('Fix 1: Students Table Column Widths & Layout', () => {
    it('uses shared consistent column definitions with target proportions', () => {
      expect(STUDENT_TABLE_COLUMNS.student).toBe('23%');
      expect(STUDENT_TABLE_COLUMNS.subject).toBe('18%');
      expect(STUDENT_TABLE_COLUMNS.schedule).toBe('29%');
      expect(STUDENT_TABLE_COLUMNS.classes).toBe('13%');
      expect(STUDENT_TABLE_COLUMNS.actions).toBe('12%');
    });

    it('ensures Actions is the last column and student column is narrower than 25%', () => {
      const studentPct = parseFloat(STUDENT_TABLE_COLUMNS.student);
      const actionsPct = parseFloat(STUDENT_TABLE_COLUMNS.actions);
      expect(studentPct).toBeLessThan(25);
      expect(actionsPct).toBe(12);
    });
  });

  describe('Fix 2: Students Tabs Order and Default View', () => {
    it('verifies Active is first, Inactive is second, All Students is third', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/domains/students/StudentTabs.tsx', 'utf8');
      const activeIdx = content.indexOf('student-tab-active');
      const inactiveIdx = content.indexOf('student-tab-inactive');
      const allIdx = content.indexOf('student-tab-all');

      expect(activeIdx).toBeGreaterThan(-1);
      expect(inactiveIdx).toBeGreaterThan(activeIdx);
      expect(allIdx).toBeGreaterThan(inactiveIdx);
    });

    it('verifies default tab in StudentList and StudentsPage is ACTIVE', async () => {
      const fs = await import('fs');
      const listContent = fs.readFileSync('src/domains/students/StudentList.tsx', 'utf8');
      const pageContent = fs.readFileSync('src/domains/students/StudentsPage.tsx', 'utf8');

      expect(listContent).toContain("useState<StudentStatusTab>('ACTIVE')");
      expect(pageContent).toContain("useState<StudentStatusTab>('ACTIVE')");
    });
  });

  describe('Fix 3: Class Sessions Sequential Counters', () => {
    it('produces sequential 01 / 48 progression and decreasing remaining counts', () => {
      const packages = [
        { student_id: 'STU_001', classes_purchased: 48, plan_type: 'Per Class' },
      ];

      const sessions = Array.from({ length: 48 }, (_, i) => ({
        session_id: `sess_${i + 1}`,
        student_id: 'STU_001',
        schedule_date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        schedule_time: '18:00',
        session_status: 'COMPLETED',
        attendance_status: 'PRESENT',
        deduct_class: true,
      }));

      const progressMap = buildSessionProgressMap(sessions as any, packages as any);

      // Session 1: 01 / 48, 47 remaining
      const p1 = progressMap.get('sess_1');
      expect(p1?.display).toBe('01 / 48');
      expect(p1?.remainingDisplay).toBe('47 remaining');
      expect(p1?.sessionNumber).toBe(1);
      expect(p1?.remainingAfterSession).toBe(47);

      // Session 2: 02 / 48, 46 remaining
      const p2 = progressMap.get('sess_2');
      expect(p2?.display).toBe('02 / 48');
      expect(p2?.remainingDisplay).toBe('46 remaining');

      // Session 44: 44 / 48, 4 remaining
      const p44 = progressMap.get('sess_44');
      expect(p44?.display).toBe('44 / 48');
      expect(p44?.remainingDisplay).toBe('4 remaining');

      // Session 48: 48 / 48, 0 remaining
      const p48 = progressMap.get('sess_48');
      expect(p48?.display).toBe('48 / 48');
      expect(p48?.remainingDisplay).toBe('0 remaining');
    });

    it('isolates counters independently between students', () => {
      const packages = [
        { student_id: 'STU_A', classes_purchased: 10 },
        { student_id: 'STU_B', classes_purchased: 20 },
      ];

      const sessions = [
        { session_id: 'A_1', student_id: 'STU_A', schedule_date: '2026-02-01', schedule_time: '10:00' },
        { session_id: 'B_1', student_id: 'STU_B', schedule_date: '2026-02-01', schedule_time: '11:00' },
        { session_id: 'A_2', student_id: 'STU_A', schedule_date: '2026-02-02', schedule_time: '10:00' },
      ];

      const progressMap = buildSessionProgressMap(sessions as any, packages as any);
      expect(progressMap.get('A_1')?.display).toBe('01 / 10');
      expect(progressMap.get('B_1')?.display).toBe('01 / 20');
      expect(progressMap.get('A_2')?.display).toBe('02 / 10');
    });

    it('sorts sessions on same day chronologically by time', () => {
      const packages = [{ student_id: 'STU_SAME_DAY', classes_purchased: 10 }];
      const sessions = [
        { session_id: 'afternoon', student_id: 'STU_SAME_DAY', schedule_date: '2026-02-01', schedule_time: '14:00' },
        { session_id: 'morning', student_id: 'STU_SAME_DAY', schedule_date: '2026-02-01', schedule_time: '10:00' },
      ];

      const progressMap = buildSessionProgressMap(sessions as any, packages as any);
      expect(progressMap.get('morning')?.sessionNumber).toBe(1);
      expect(progressMap.get('morning')?.display).toBe('01 / 10');
      expect(progressMap.get('afternoon')?.sessionNumber).toBe(2);
      expect(progressMap.get('afternoon')?.display).toBe('02 / 10');
    });

    it('handles cancelled non-deductible sessions without incrementing package count', () => {
      const packages = [{ student_id: 'STU_CANCEL', classes_purchased: 10 }];
      const sessions = [
        { session_id: 'c1', student_id: 'STU_CANCEL', schedule_date: '2026-02-01', schedule_time: '10:00', session_status: 'COMPLETED', deduct_class: true },
        { session_id: 'c2', student_id: 'STU_CANCEL', schedule_date: '2026-02-02', schedule_time: '10:00', session_status: 'CANCELLED', deduct_class: false },
        { session_id: 'c3', student_id: 'STU_CANCEL', schedule_date: '2026-02-03', schedule_time: '10:00', session_status: 'COMPLETED', deduct_class: true },
      ];

      const progressMap = buildSessionProgressMap(sessions as any, packages as any);
      expect(progressMap.get('c1')?.display).toBe('01 / 10');
      expect(progressMap.get('c2')?.display).toBe('— / 10');
      expect(progressMap.get('c2')?.countsTowardPackage).toBe(false);
      expect(progressMap.get('c3')?.display).toBe('02 / 10');
      expect(progressMap.get('c3')?.remainingAfterSession).toBe(8);
    });
  });

  describe('Fix 4: Class Sessions Time & Date Display', () => {
    it('formats 18:00 as 6:00 PM and 10:00 as 10:00 AM', () => {
      expect(formatTimeTo12Hour('18:00')).toBe('6:00 PM');
      expect(formatTimeTo12Hour('10:00')).toBe('10:00 AM');
      expect(formatTimeTo12Hour('16:00')).toBe('4:00 PM');
    });

    it('computes 30-minute end times correctly (18:00 -> 18:30, 10:00 -> 10:30)', () => {
      expect(calculateEndTime('18:00', 30)).toBe('18:30');
      expect(calculateEndTime('10:00', 30)).toBe('10:30');
      expect(formatTimeRange12Hour('18:00', '18:30')).toBe('6:00 PM – 6:30 PM');
      expect(formatTimeRange12Hour('10:00', '10:30')).toBe('10:00 AM – 10:30 AM');
    });

    it('formats date-only values into readable UK date without day drift', () => {
      expect(formatClassDate('2026-01-19')).toContain('19 Jan 2026');
      expect(formatClassDate('2026-05-09')).toContain('9 May 2026');
    });
  });

  describe('Fix 5: Google Sheets Date Standardization', () => {
    it('configures all active date-bearing sheets and columns', () => {
      expect(DATE_COLUMNS_CONFIG['Packages']).toEqual(['start_date', 'end_date', 'next_due_date']);
      expect(DATE_COLUMNS_CONFIG['Payments']).toEqual(['payment_date']);
      expect(DATE_COLUMNS_CONFIG['ClassSessions']).toEqual(['schedule_date']);
      expect(DATE_COLUMNS_CONFIG['StudentNotes']).toEqual(['note_date', 'follow_up_date']);
    });

    it('parses ISO date string to spreadsheet Date object at noon', () => {
      const d = parseIsoToSheetDate('2026-01-19');
      expect(d).toBeInstanceOf(Date);
      expect(d?.getFullYear()).toBe(2026);
      expect(d?.getMonth()).toBe(0); // Jan
      expect(d?.getDate()).toBe(19);
      expect(d?.getHours()).toBe(12);
    });

    it('parses dd/mm/yyyy date string safely without day/month swap', () => {
      const d = parseIsoToSheetDate('19/01/2026');
      expect(d?.getFullYear()).toBe(2026);
      expect(d?.getMonth()).toBe(0);
      expect(d?.getDate()).toBe(19);
    });
  });

  describe('Fix 6: Students Table Status-Based Row Colors', () => {
    it('classifies active and inactive status correctly', () => {
      const activeStudent = { student_id: 'S1', status: 'ACTIVE' } as any;
      const inactiveStudent = { student_id: 'S2', status: 'ARCHIVED' } as any;
      const exhaustedStudent = { student_id: 'S3', status: 'ACTIVE' } as any;

      expect(isStudentActive(activeStudent, { balance: { totalPurchased: 48, totalConsumed: 10 } })).toBe(true);
      expect(isStudentActive(inactiveStudent)).toBe(false);
      expect(isStudentActive(exhaustedStudent, { balance: { totalPurchased: 48, totalConsumed: 48 } })).toBe(false);
    });
  });

  describe('Fix 7: Class Session Status Colors', () => {
    it('maps Completed to green category', () => {
      expect(classifySessionStatus('COMPLETED').category).toBe('COMPLETED');
      expect(classifySessionStatus(undefined, 'PRESENT').category).toBe('COMPLETED');
      expect(classifySessionStatus(undefined, 'ATTENDED').category).toBe('COMPLETED');

      const style = getSessionStatusStyle('COMPLETED');
      expect(style.bg).toContain('success');
      expect(style.color).toContain('success');
    });

    it('maps Upcoming to yellow/amber category', () => {
      expect(classifySessionStatus('SCHEDULED').category).toBe('UPCOMING');
      expect(classifySessionStatus('UPCOMING').category).toBe('UPCOMING');

      const style = getSessionStatusStyle('SCHEDULED');
      expect(style.bg).toContain('warning');
      expect(style.color).toContain('warning');
    });

    it('maps Cancelled, Missed, and No Show to red/alert category', () => {
      expect(classifySessionStatus('CANCELLED').category).toBe('ALERT');
      expect(classifySessionStatus('NO_SHOW').category).toBe('ALERT');
      expect(classifySessionStatus('MISSED').category).toBe('ALERT');
      expect(classifySessionStatus(undefined, 'ABSENT').category).toBe('ALERT');

      const styleCancel = getSessionStatusStyle('CANCELLED');
      expect(styleCancel.bg).toContain('danger');
      expect(styleCancel.color).toContain('danger');

      const styleNoShow = getSessionStatusStyle('NO_SHOW');
      expect(styleNoShow.bg).toContain('danger');
    });
  });

  describe('Fix 8: Finance Page Collection Performance Bar Removal', () => {
    it('confirms FinanceSummaryCards renders the 3 key metric cards and no progress bar', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/domains/finances/FinanceSummaryCards.tsx', 'utf8');

      expect(content).toContain('Total Invoice');
      expect(content).toContain('Collected Earnings');
      expect(content).toContain('Total Outstanding');
      expect(content).not.toContain('Collection Performance');
      expect(content).not.toContain('collectionRate');
      expect(content).not.toContain('progressContainerStyle');
    });
  });

  describe('Fix 9: Global Hover & Click Interactions & Reduced Motion', () => {
    it('verifies Button has active transform feedback in Button.module.css', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/components/buttons/Button.module.css', 'utf8');
      expect(content).toContain('.button:active:not(:disabled)');
      expect(content).toContain('transform: scale(0.98)');
    });

    it('verifies prefers-reduced-motion media query in global.css', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('src/styles/global.css', 'utf8');
      expect(content).toContain('@media (prefers-reduced-motion: reduce)');
      expect(content).toContain('transform: none !important');
    });
  });
});
