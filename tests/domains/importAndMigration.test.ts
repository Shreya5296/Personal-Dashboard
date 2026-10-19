import { describe, it, expect, beforeEach } from 'vitest';
import { MockSpreadsheet } from '../mocks/MockSpreadsheet';

// @ts-ignore
import SheetRegistry from '../../02-backend/apps-script/sheets/SheetRegistry.gs';
// @ts-ignore
import SpreadsheetBootstrap from '../../02-backend/apps-script/sheets/SpreadsheetBootstrap.gs';
// @ts-ignore
import StudentService from '../../02-backend/apps-script/students/StudentService.gs';
// @ts-ignore
import ImportService from '../../02-backend/apps-script/imports/ImportService.gs';

describe('Phase 8: Import and Migration Workflow', () => {
  let spreadsheet: MockSpreadsheet;
  const actor = { actorId: 'usr_admin', email: 'admin@example.com', requestId: 'req_imp_test' };

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');
  });

  it('detects missing names, valid rows, and duplicate student candidates in preview', () => {
    StudentService.Students_create(spreadsheet, {
      first_name: 'Existing',
      last_name: 'Student',
      parent_guardian_name: 'Existing Parent',
      parent_email: 'existing@example.com',
      primary_phone: '+919999988888',
    }, actor);

    const rawRows = [
      { rowNumber: 1, fullName: 'New Student One', email: 'one@example.com', phone: '+919111111111' },
      { rowNumber: 2, fullName: '', email: 'noname@example.com' }, // Invalid (no name)
      { rowNumber: 3, fullName: 'Existing Student', email: 'other@example.com' }, // Duplicate by name
      { rowNumber: 4, fullName: 'Someone Else', email: 'existing@example.com' }, // Duplicate by email
      { rowNumber: 5, fullName: 'New Student Two', email: 'two@example.com' }, // Valid
    ];

    const preview = ImportService.Imports_preview(spreadsheet, rawRows);

    expect(preview.totalRows).toBe(5);
    expect(preview.validRows).toBe(2);
    expect(preview.duplicateRows).toBe(2);
    expect(preview.errorRows).toBe(1);

    expect(preview.rows[0].validationError).toBeNull();
    expect(preview.rows[0].isDuplicate).toBe(false);

    expect(preview.rows[1].validationError).toContain('Missing required full name');
    expect(preview.rows[2].isDuplicate).toBe(true);
    expect(preview.rows[3].isDuplicate).toBe(true);
  });

  it('executes import batch safely, creating target students and row reconciliation records', () => {
    const rawRows = [
      { rowNumber: 1, fullName: 'Imported Student Alpha', email: 'alpha@example.com', phone: '+919222222222' },
      { rowNumber: 2, fullName: 'Imported Student Beta', email: 'beta@example.com' },
      { rowNumber: 3, fullName: '', email: 'bad@example.com' }, // Invalid
    ];

    const result = ImportService.Imports_execute(spreadsheet, rawRows, actor);

    expect(result.batchId).toMatch(/^imp_/);
    expect(result.totalRows).toBe(3);
    expect(result.importedCount).toBe(2);
    expect(result.errorCount).toBe(1);

    // Verify row reconciliation records in ImportRowResults sheet
    const resultsSheet = spreadsheet.getSheetByName(SheetRegistry.SHEET_NAMES.IMPORT_ROW_RESULTS)!;
    const resultRows = resultsSheet.getData().slice(1);
    expect(resultRows).toHaveLength(3);

    // Verify batch record in ImportBatches sheet
    const batchesSheet = spreadsheet.getSheetByName(SheetRegistry.SHEET_NAMES.IMPORT_BATCHES)!;
    const batchRows = batchesSheet.getData().slice(1);
    expect(batchRows).toHaveLength(1);
    expect(batchRows[0][0]).toBe(result.batchId);
    expect(batchRows[0][6]).toBe('COMPLETED'); // import_status
  });
});
