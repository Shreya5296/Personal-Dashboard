import { describe, it, expect } from 'vitest';
import { Classes_complete, Classes_cancel } from '../../02-backend/apps-script/classes/ClassService.gs';
import { getMonthSessionStyle } from '../../src/domains/calendar/monthEventStyle';
import { buildClassScheduleColumns } from '../../src/domains/classes/classScheduleColumns';
import { STUDENT_TABLE_COLUMNS } from '../../src/domains/students/studentTableLayout';
import fs from 'fs';
import path from 'path';

// Mock in-memory spreadsheet for backend testing
function createMockBackend() {
  const classesData: any[][] = [
    ['student_id', 'student_name', 'schedule_date', 'schedule_time', 'attendance_status', 'session_status', 'cancellation_reason', 'deduct_class'],
    ['STU_TEST', 'Test Student', '2026-11-01', '10:00', 'NOT_MARKED', 'SCHEDULED', '', false],
    ['STU_TEST', 'Test Student', '2026-11-08', '10:00', 'NOT_MARKED', 'SCHEDULED', '', false],
  ];

  const packagesData: any[][] = [
    ['package_id', 'student_id', 'student_name', 'plan_type', 'currency', 'package_price', 'total_classes', 'start_date', 'end_date', 'class_duration', 'class_schedule', 'status'],
    ['pkg_STU_TEST', 'STU_TEST', 'Test Student', 'Per Class', 'INR', 2000, 2, '2026-11-01', '2026-11-08', 30, 'Sun - 10:00 AM', 'ACTIVE'],
  ];

  const createSheet = (name: string, data: any[][]) => ({
    getName: () => name,
    getLastRow: () => data.length,
    getLastColumn: () => (data[0] ? data[0].length : 0),
    getDataRange: () => ({
      getValues: () => data.map((r) => [...r]),
    }),
    getRange: (row: number, col: number, numRows: number, numCols: number) => ({
      getValues: () => {
        const rows: any[][] = [];
        for (let r = 0; r < numRows; r++) {
          const rowIdx = row - 1 + r;
          const curr = data[rowIdx] || [];
          rows.push(curr.slice(col - 1, col - 1 + numCols));
        }
        return rows;
      },
      setValues: (newVals: any[][]) => {
        for (let r = 0; r < numRows; r++) {
          const rowIdx = row - 1 + r;
          while (data.length <= rowIdx) data.push([]);
          for (let c = 0; c < numCols; c++) {
            data[rowIdx][col - 1 + c] = newVals[r][c];
          }
        }
      },
    }),
    appendRow: (rowVals: any[]) => {
      data.push([...rowVals]);
    },
    deleteRow: (rowNum: number) => {
      data.splice(rowNum - 1, 1);
    },
  });

  const sheets: Record<string, any> = {
    ClassSessions: createSheet('ClassSessions', classesData),
    Packages: createSheet('Packages', packagesData),
  };

  return {
    getSheetByName: (name: string) => sheets[name] || null,
    getSpreadsheetTimeZone: () => 'Asia/Kolkata',
    _data: { classes: classesData, packages: packagesData },
  };
}

describe('Fix Batch 3 — Attendance, Rescheduling, Student Details & Global Tables', () => {
  it('Fix 1: Classes_complete records attendance_status = PRESENT, session_status = COMPLETED, deduct_class = true', () => {
    const mockSpreadsheet = createMockBackend();
    const res = Classes_complete(mockSpreadsheet, {
      session_id: 'STU_TEST__2026-11-01__10:00',
      attendance_status: 'PRESENT',
    });

    expect(res.success).toBe(true);
    expect(res.data.attendance_status).toBe('PRESENT');
    expect(res.data.session_status).toBe('COMPLETED');
    expect(res.data.deduct_class).toBe(true);

    // Verify row persisted in mock Google Sheet
    const row = mockSpreadsheet._data.classes[1]; // row index 2 in 1-based
    expect(row[4]).toBe('PRESENT'); // attendance_status
    expect(row[5]).toBe('COMPLETED'); // session_status
    expect(row[7]).toBe(true); // deduct_class
  });

  it('Fix 2: Classes_cancel with deduct_class = false schedules replacement session and updates package end_date', () => {
    const mockSpreadsheet = createMockBackend();
    const cancelRes = Classes_cancel(mockSpreadsheet, {
      session_id: 'STU_TEST__2026-11-01__10:00',
      cancellation_reason: 'Student rescheduled with notice',
      deduct_class: false,
    });

    expect(cancelRes.success).toBe(true);
    expect(cancelRes.data.session_status).toBe('CANCELLED');
    expect(cancelRes.data.deduct_class).toBe(false);
    expect(cancelRes.data.replacement_session).toBeDefined();
    expect(cancelRes.data.replacement_session.schedule_date).toBe('2026-11-15');

    // Verify replacement session was inserted into ClassSessions sheet
    const allRows = mockSpreadsheet._data.classes;
    expect(allRows.length).toBe(4); // header + original 2 + 1 replacement
    const repRow = allRows[3];
    expect(repRow[0]).toBe('STU_TEST');
    expect(repRow[2]).toBe('2026-11-15');
    expect(repRow[3]).toBe('10:00');
    expect(repRow[5]).toBe('SCHEDULED');

    // Verify package end_date was extended
    const pkgRow = mockSpreadsheet._data.packages[1];
    expect(pkgRow[8]).toBe('2026-11-15');

    // Test idempotency: calling cancel again must not add duplicate replacement sessions
    const retryRes = Classes_cancel(mockSpreadsheet, {
      session_id: 'STU_TEST__2026-11-01__10:00',
      deduct_class: false,
    });
    expect(retryRes.success).toBe(true);
    expect(mockSpreadsheet._data.classes.length).toBe(4); // Still 4, no duplicates
  });

  it('Fix 2: Classes_cancel with deduct_class = true does NOT schedule replacement session', () => {
    const mockSpreadsheet = createMockBackend();
    const cancelRes = Classes_cancel(mockSpreadsheet, {
      session_id: 'STU_TEST__2026-11-01__10:00',
      cancellation_reason: 'Late cancellation by student',
      deduct_class: true,
    });

    expect(cancelRes.success).toBe(true);
    expect(cancelRes.data.session_status).toBe('CANCELLED');
    expect(cancelRes.data.deduct_class).toBe(true);
    expect(cancelRes.data.replacement_session).toBeNull();
    expect(mockSpreadsheet._data.classes.length).toBe(3); // No replacement added
  });

  it('Fix 3: archived live-sync scripts exist in scripts/archive and are documented', () => {
    const archiveDir = path.resolve(__dirname, '../../scripts/archive');
    expect(fs.existsSync(path.join(archiveDir, 'live-sync-stu004.js'))).toBe(true);
    expect(fs.existsSync(path.join(archiveDir, 'live-sync-stu005.js'))).toBe(true);
    expect(fs.existsSync(path.join(archiveDir, 'README.md'))).toBe(true);
  });

  it('Fix 5: month view fades past completed sessions and highlights upcoming sessions', () => {
    const pastCompletedStyle = getMonthSessionStyle(
      { session_id: 's1', student_id: 'st1', session_status: 'COMPLETED', attendance_status: 'PRESENT', start_time: '10:00', duration_minutes: 30, status: 'COMPLETED' },
      true // isPast
    );
    expect(pastCompletedStyle.bg).toBe('#f4fdf8');
    expect(pastCompletedStyle.border).toContain('#bbf7d0');
    expect(pastCompletedStyle.color).toBe('#166534');
    expect(pastCompletedStyle.opacity).toBeLessThan(1);

    const upcomingStyle = getMonthSessionStyle(
      { session_id: 's2', student_id: 'st1', session_status: 'SCHEDULED', attendance_status: 'NOT_MARKED', start_time: '10:00', duration_minutes: 30, status: 'SCHEDULED' },
      false // isPast
    );
    expect(upcomingStyle.bg).toBe('#ecfdf5');
    expect(upcomingStyle.border).toContain('#10b981');
    expect(upcomingStyle.opacity).toBe(1);
  });

  it('Fix 6: class schedule columns define consistent proportional widths summing to 100%', () => {
    const cols = buildClassScheduleColumns({
      todayKey: '2026-10-26',
      nowMs: Date.now(),
      getStudentConsumedClasses: () => ({ consumed: 2, purchased: 10 }),
      getStudentMeetingLink: () => undefined,
      handleUpdateStatus: async () => {},
      handleRestore: async () => {},
    });

    const widths = cols.map((c) => parseInt(c.width || '0', 10));
    const totalWidth = widths.reduce((sum, w) => sum + w, 0);
    expect(totalWidth).toBe(100);
    expect(cols.find((c) => c.key === 'student')?.width).toBe('18%');
    expect(cols.find((c) => c.key === 'date')?.width).toBe('17%');
    expect(cols.find((c) => c.key === 'start_time')?.width).toBe('15%');
    expect(cols.find((c) => c.key === 'consumed')?.width).toBe('14%');
    expect(cols.find((c) => c.key === 'join')?.width).toBe('12%');
    expect(cols.find((c) => c.key === 'attendance')?.width).toBe('24%');
  });
});
