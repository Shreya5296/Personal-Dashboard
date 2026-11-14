import { describe, it, expect } from 'vitest';
import {
  buildStudentIdMigrationMap,
  runStudentIdMigration,
} from '../../02-backend/apps-script/setup/StudentIdMigration.gs';
import {
  runStudentIdMigrationPreflight,
} from '../../02-backend/apps-script/setup/StudentIdPreflight.gs';
import {
  verifyStudentIdReferentialIntegrity,
  rollbackStudentIdMigration,
} from '../../02-backend/apps-script/setup/StudentIdVerification.gs';

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

describe('Student ID Migration Preflight Engine', () => {
  it('reports READY and provides proposed sequential mapping on valid data', () => {
    const sheets = {
      Students: createMockSheet('Students', ['student_id', 'student_name'], [
        ['STU_001', 'Seerat'],
        ['STU_002', 'Rehaan'],
        ['stu_legacy_1', 'Legacy Student 1'],
        ['stu_legacy_2', 'Legacy Student 2'],
      ]),
      Packages: createMockSheet('Packages', ['package_id', 'student_id'], [
        ['pkg_1', 'STU_001'],
        ['pkg_2', 'stu_legacy_1'],
      ]),
    };
    const ss = createMockSpreadsheet(sheets);
    const preflight = runStudentIdMigrationPreflight(ss as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet);

    expect(preflight.ready).toBe(true);
    expect(preflight.status).toBe('READY');
    expect(preflight.reasons).toHaveLength(0);
    expect(preflight.proposedMapping['stu_legacy_1']).toBe('STU_003');
    expect(preflight.proposedMapping['stu_legacy_2']).toBe('STU_004');
    expect(preflight.stats.legacyStudentCount).toBe(2);
    expect(preflight.stats.standardStudentCount).toBe(2);
  });

  it('reports BLOCKED if duplicate student IDs exist in Students tab', () => {
    const sheets = {
      Students: createMockSheet('Students', ['student_id', 'student_name'], [
        ['STU_001', 'Seerat'],
        ['stu_dup_1', 'Student A'],
        ['stu_dup_1', 'Student B'],
      ]),
    };
    const ss = createMockSpreadsheet(sheets);
    const preflight = runStudentIdMigrationPreflight(ss as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet);

    expect(preflight.ready).toBe(false);
    expect(preflight.status).toBe('BLOCKED');
    expect(preflight.reasons.some((r) => r.includes('Duplicate student ID'))).toBe(true);
  });

  it('reports BLOCKED if dangling foreign keys exist in dependent tables', () => {
    const sheets = {
      Students: createMockSheet('Students', ['student_id', 'student_name'], [
        ['STU_001', 'Seerat'],
      ]),
      Packages: createMockSheet('Packages', ['package_id', 'student_id'], [
        ['pkg_1', 'stu_nonexistent'],
      ]),
    };
    const ss = createMockSpreadsheet(sheets);
    const preflight = runStudentIdMigrationPreflight(ss as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet);

    expect(preflight.ready).toBe(false);
    expect(preflight.status).toBe('BLOCKED');
    expect(preflight.reasons.some((r) => r.includes('Dangling foreign-key references'))).toBe(true);
  });

  it('reports BLOCKED if Students tab or student_id column is missing', () => {
    const sheets = {
      Students: createMockSheet('Students', ['bad_col', 'student_name'], [
        ['STU_001', 'Seerat'],
      ]),
    };
    const ss = createMockSpreadsheet(sheets);
    const preflight = runStudentIdMigrationPreflight(ss as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet);

    expect(preflight.ready).toBe(false);
    expect(preflight.status).toBe('BLOCKED');
    expect(preflight.reasons.some((r) => r.includes('student_id column not found'))).toBe(true);
  });
});

describe('Student ID Migration Execution & Recovery Engine', () => {
  it('cascades student ID updates across all dependent tables including schedules', () => {
    const sheets = {
      Students: createMockSheet('Students', ['student_id', 'student_name'], [
        ['STU_001', 'Seerat'],
        ['stu_legacy_1', 'Synthetic Learner'],
      ]),
      Packages: createMockSheet('Packages', ['package_id', 'student_id'], [
        ['pkg_1', 'stu_legacy_1'],
      ]),
      Payments: createMockSheet('Payments', ['payment_id', 'student_id'], [
        ['pay_1', 'stu_legacy_1'],
      ]),
      ClassSessions: createMockSheet('ClassSessions', ['session_id', 'student_id'], [
        ['cls_1', 'stu_legacy_1'],
      ]),
      MeetingLinks: createMockSheet('MeetingLinks', ['meeting_link_id', 'student_id'], [
        ['ml_1', 'stu_legacy_1'],
      ]),
      StudentNotes: createMockSheet('StudentNotes', ['note_id', 'student_id'], [
        ['note_1', 'stu_legacy_1'],
      ]),
      ClassSchedules: createMockSheet('ClassSchedules', ['schedule_id', 'student_id'], [
        ['csch_1', 'stu_legacy_1'],
      ]),
    };
    const ss = createMockSpreadsheet(sheets);
    const result = runStudentIdMigration(ss as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet);

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(1);
    expect(result.mapping['stu_legacy_1']).toBe('STU_002');

    expect(sheets.Students._getRawData()[2][0]).toBe('STU_002');
    expect(sheets.Packages._getRawData()[1][1]).toBe('STU_002');
    expect(sheets.Payments._getRawData()[1][1]).toBe('STU_002');
    expect(sheets.ClassSessions._getRawData()[1][1]).toBe('STU_002');
    expect(sheets.MeetingLinks._getRawData()[1][1]).toBe('STU_002');
    expect(sheets.StudentNotes._getRawData()[1][1]).toBe('STU_002');
    expect(sheets.ClassSchedules._getRawData()[1][1]).toBe('STU_002');
  });

  it('resumes interrupted partial migration using existing backup mapping without generating new IDs', () => {
    const sheets = {
      Students: createMockSheet('Students', ['student_id', 'student_name'], [
        ['STU_001', 'Seerat'],
        ['STU_002', 'Synthetic Learner'],
      ]),
      Packages: createMockSheet('Packages', ['package_id', 'student_id'], [
        ['pkg_1', 'STU_002'],
      ]),
      MeetingLinks: createMockSheet('MeetingLinks', ['meeting_link_id', 'student_id'], [
        ['ml_1', 'stu_legacy_1'], // Interrupted before this was updated!
      ]),
      StudentNotes: createMockSheet('StudentNotes', ['note_id', 'student_id'], [
        ['note_1', 'stu_legacy_1'],
      ]),
      StudentId_Migration_Backup: createMockSheet('StudentId_Migration_Backup', ['original_id', 'migrated_id', 'status'], [
        ['stu_legacy_1', 'STU_002', 'MAPPED'],
      ]),
    };
    const ss = createMockSpreadsheet(sheets);

    const retryRes = runStudentIdMigration(ss as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet);
    expect(retryRes.success).toBe(true);
    expect(retryRes.resumed).toBe(true);
    expect(retryRes.mapping['stu_legacy_1']).toBe('STU_002');

    expect(sheets.MeetingLinks._getRawData()[1][1]).toBe('STU_002');
    expect(sheets.StudentNotes._getRawData()[1][1]).toBe('STU_002');
    expect(sheets.Students._getRawData()[2][0]).toBe('STU_002');
  });

  it('is completely idempotent when run multiple times on completed data', () => {
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
    expect(result.alreadyCompleted).toBe(true);
  });

  it('safely rolls back migrations restoring original IDs across all tables', () => {
    const sheets = {
      Students: createMockSheet('Students', ['student_id', 'student_name'], [
        ['STU_001', 'Seerat'],
        ['stu_legacy_1', 'Synthetic Learner'],
      ]),
      Packages: createMockSheet('Packages', ['package_id', 'student_id'], [
        ['pkg_1', 'stu_legacy_1'],
      ]),
      MeetingLinks: createMockSheet('MeetingLinks', ['meeting_link_id', 'student_id'], [
        ['ml_1', 'stu_legacy_1'],
      ]),
    };
    const ss = createMockSpreadsheet(sheets);

    runStudentIdMigration(ss as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet);
    expect(sheets.Students._getRawData()[2][0]).toBe('STU_002');

    const rollbackRes = rollbackStudentIdMigration(ss as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet);
    expect(rollbackRes.success).toBe(true);
    expect(rollbackRes.rolledBackCount).toBe(1);

    expect(sheets.Students._getRawData()[2][0]).toBe('stu_legacy_1');
    expect(sheets.Packages._getRawData()[1][1]).toBe('stu_legacy_1');
    expect(sheets.MeetingLinks._getRawData()[1][1]).toBe('stu_legacy_1');
  });

  it('handles rollback safely when backup sheet is missing or empty', () => {
    const sheets = {
      Students: createMockSheet('Students', ['student_id', 'student_name'], [
        ['STU_001', 'Seerat'],
      ]),
    };
    const ss = createMockSpreadsheet(sheets);
    const rollbackRes = rollbackStudentIdMigration(ss as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet);
    expect(rollbackRes.success).toBe(false);
    expect(rollbackRes.message).toContain('No StudentId_Migration_Backup');
  });

  it('verifies integrity using verifyStudentIdReferentialIntegrity and detects dangling keys', () => {
    const sheets = {
      Students: createMockSheet('Students', ['student_id', 'student_name'], [
        ['STU_001', 'Seerat'],
        ['stu_legacy_x', 'Legacy Student'],
      ]),
      Packages: createMockSheet('Packages', ['package_id', 'student_id'], [
        ['pkg_1', 'STU_001'],
        ['pkg_dangling', 'STU_999_NONEXISTENT'],
      ]),
    };
    const ss = createMockSpreadsheet(sheets);
    const audit = verifyStudentIdReferentialIntegrity(ss as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet);

    expect(audit.success).toBe(true);
    expect(audit.isValid).toBe(false);
    expect(audit.totalStudents).toBe(2);
    expect(audit.nonStandardStudentIds).toEqual(['stu_legacy_x']);
    expect(audit.danglingReferences.Packages).toHaveLength(1);
    expect(audit.danglingReferences.Packages[0].student_id).toBe('STU_999_NONEXISTENT');
  });
});
