import { describe, it, expect } from 'vitest';
import {
  buildStudentIdMigrationMap,
  runStudentIdMigration,
} from '../../02-backend/apps-script/setup/StudentIdMigration.gs';

function createMockSheet(name: string, headers: string[], initialRows: unknown[][] = []) {
  const data: unknown[][] = headers.length > 0 ? [headers, ...initialRows.map((r) => [...r])] : [];
  return {
    name,
    getLastRow: () => data.length,
    getLastColumn: () => (data[0] ? data[0].length : 0),
    getRange: (row: number, col: number, numRows: number, numCols: number) => {
      return {
        getValues: () => {
          const res: unknown[][] = [];
          for (let r = 0; r < numRows; r++) {
            const rowVals: unknown[] = [];
            for (let c = 0; c < numCols; c++) {
              const rIdx = row - 1 + r;
              const cIdx = col - 1 + c;
              rowVals.push(data[rIdx] ? data[rIdx][cIdx] : '');
            }
            res.push(rowVals);
          }
          return res;
        },
        setValues: (newVals: unknown[][]) => {
          for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < numCols; c++) {
              const rIdx = row - 1 + r;
              const cIdx = col - 1 + c;
              if (data[rIdx]) data[rIdx][cIdx] = newVals[r][c];
            }
          }
        },
      };
    },
    appendRow: (rowVals: unknown[]) => {
      data.push([...rowVals]);
    },
    _getRawData: () => data,
  };
}

function createMockSpreadsheet(sheetsMap: Record<string, ReturnType<typeof createMockSheet>>) {
  return {
    getSheetByName: (name: string) => sheetsMap[name] || null,
    insertSheet: (name: string) => {
      const sh = createMockSheet(name, []);
      sheetsMap[name] = sh;
      return sh;
    },
  };
}

describe('Student ID Migration Engine', () => {
  it('builds sequential migration map avoiding existing standard IDs', () => {
    const students = [
      { student_id: 'STU_001' },
      { student_id: 'STU_002' },
      { student_id: 'STU_003' },
      { student_id: 'stu_mvm12345' },
      { student_id: 'stu_mvm67890' },
    ];
    const map = buildStudentIdMigrationMap(students);
    expect(map['stu_mvm12345']).toBe('STU_004');
    expect(map['stu_mvm67890']).toBe('STU_005');
    expect(map['STU_001']).toBeUndefined();
    expect(map['STU_002']).toBeUndefined();
    expect(map['STU_003']).toBeUndefined();
  });

  it('handles existing gaps and collision prevention during ID allocation', () => {
    const students = [
      { student_id: 'STU_001' },
      { student_id: 'STU_005' }, // Gap: STU_002, 003, 004 unused, max is 5
      { student_id: 'stu_legacy_a' },
    ];
    const map = buildStudentIdMigrationMap(students);
    expect(map['stu_legacy_a']).toBe('STU_006');
  });

  it('cascades student ID updates across all 7 dependent tables', () => {
    const sheets = {
      Students: createMockSheet('Students', ['student_id', 'student_name', 'status'], [
        ['STU_001', 'Seerat', 'Active'],
        ['stu_legacy_1', 'Synthetic Learner', 'Active'],
      ]),
      Packages: createMockSheet('Packages', ['package_id', 'student_id', 'total_classes'], [
        ['pkg_1', 'STU_001', 12],
        ['pkg_2', 'stu_legacy_1', 10],
      ]),
      Payments: createMockSheet('Payments', ['payment_id', 'student_id', 'amount'], [
        ['pay_1', 'STU_001', 5000],
        ['pay_2', 'stu_legacy_1', 2500],
      ]),
      ClassSessions: createMockSheet('ClassSessions', ['session_id', 'student_id', 'status'], [
        ['cls_1', 'stu_legacy_1', 'ATTENDED'],
      ]),
      MeetingLinks: createMockSheet('MeetingLinks', ['meeting_link_id', 'student_id', 'meeting_url'], [
        ['ml_1', 'stu_legacy_1', 'https://meet.google.com/xyz'],
      ]),
      StudentNotes: createMockSheet('StudentNotes', ['note_id', 'student_id', 'content'], [
        ['note_1', 'stu_legacy_1', 'Good test score.'],
      ]),
      ClassSchedules: createMockSheet('ClassSchedules', ['schedule_id', 'student_id', 'day_of_week'], [
        ['sched_1', 'stu_legacy_1', 'MONDAY'],
      ]),
      AuditLog: createMockSheet('AuditLog', ['audit_id', 'entity_type', 'entity_id', 'action'], [
        ['aud_1', 'STUDENT', 'stu_legacy_1', 'CREATE'],
        ['aud_2', 'PACKAGE', 'pkg_2', 'CREATE'],
      ]),
    };

    const ss = createMockSpreadsheet(sheets);
    const result = runStudentIdMigration(ss as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet);

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(1);
    expect(result.mapping['stu_legacy_1']).toBe('STU_002');

    // Verify all sheets updated
    expect(sheets.Students._getRawData()[2][0]).toBe('STU_002');
    expect(sheets.Packages._getRawData()[2][1]).toBe('STU_002');
    expect(sheets.Payments._getRawData()[2][1]).toBe('STU_002');
    expect(sheets.ClassSessions._getRawData()[1][1]).toBe('STU_002');
    expect(sheets.MeetingLinks._getRawData()[1][1]).toBe('STU_002');
    expect(sheets.StudentNotes._getRawData()[1][1]).toBe('STU_002');
    expect(sheets.ClassSchedules._getRawData()[1][1]).toBe('STU_002');
    expect(sheets.AuditLog._getRawData()[1][2]).toBe('STU_002'); // entity_type == 'STUDENT'
    expect(sheets.AuditLog._getRawData()[2][2]).toBe('pkg_2'); // entity_type == 'PACKAGE' preserved

    // Verify standard STU_001 was untouched
    expect(sheets.Students._getRawData()[1][0]).toBe('STU_001');
    expect(sheets.Packages._getRawData()[1][1]).toBe('STU_001');
    expect(sheets.Payments._getRawData()[1][1]).toBe('STU_001');

    // Verify backup sheet created
    const backup = ss.getSheetByName('StudentId_Migration_Backup');
    expect(backup).not.toBeNull();
    expect(backup!._getRawData()[1][0]).toBe('stu_legacy_1');
    expect(backup!._getRawData()[1][1]).toBe('STU_002');
  });

  it('is completely idempotent when run multiple times', () => {
    const sheets = {
      Students: createMockSheet('Students', ['student_id', 'student_name'], [
        ['STU_001', 'Seerat'],
        ['STU_002', 'Rehaan'],
      ]),
    };
    const ss = createMockSpreadsheet(sheets);
    const result = runStudentIdMigration(ss as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet);
    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(0);
    expect(result.message).toContain('No legacy student IDs found');
  });
});
