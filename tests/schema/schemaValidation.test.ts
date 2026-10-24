import { describe, it, expect } from 'vitest';
import { MockSpreadsheet } from '../mocks/MockSpreadsheet';

// @ts-ignore
import SheetRegistry from '../../02-backend/apps-script/sheets/SheetRegistry.gs';
// @ts-ignore
import SchemaValidator from '../../02-backend/apps-script/sheets/SchemaValidator.gs';
// @ts-ignore
import HeaderMapper from '../../02-backend/apps-script/sheets/HeaderMapper.gs';
// @ts-ignore
import SpreadsheetBootstrap from '../../02-backend/apps-script/sheets/SpreadsheetBootstrap.gs';
// @ts-ignore
import IdGenerator from '../../02-backend/apps-script/shared/IdGenerator.gs';

describe('Phase 3 — Data Schema and Spreadsheet Validation', () => {
  it('initializes canonical tabs on empty spreadsheet', () => {
    const spreadsheet = new MockSpreadsheet();
    const result = SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '2.0.0');

    expect(result.success).toBe(true);
    expect(result.createdTabs.length).toBe(9);

    const validation = SchemaValidator.validateSpreadsheetSchema(spreadsheet, SheetRegistry);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it('fails validation when a canonical tab is missing', () => {
    const spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');

    // Remove Students tab
    spreadsheet.sheets.delete('Students');

    const validation = SchemaValidator.validateSpreadsheetSchema(spreadsheet, SheetRegistry);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e: string) => e.includes('Missing required sheet tab: Students'))).toBe(true);
  });

  it('fails validation when a required column header is missing', () => {
    const spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');

    // Corrupt Payments headers by omitting amount
    const paymentsSheet = spreadsheet.getSheetByName('Payments');
    if (paymentsSheet) {
      paymentsSheet.rows[0] = paymentsSheet.rows[0].filter((h: string) => h !== 'amount');
    }

    const validation = SchemaValidator.validateSpreadsheetSchema(spreadsheet, SheetRegistry);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e: string) => e.includes('missing required header: amount'))).toBe(true);
  });

  it('fails validation when duplicate headers exist in a sheet', () => {
    const spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');

    const sheet = spreadsheet.getSheetByName('Students');
    if (sheet) {
      sheet.rows[0].push('student_name'); // Duplicate header
    }

    const validation = SchemaValidator.validateSpreadsheetSchema(spreadsheet, SheetRegistry);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e: string) => e.includes('duplicate header: student_name'))).toBe(true);
  });

  it('maps records using HeaderMapper irrespective of column positions', () => {
    const headers = ['last_name', 'student_id', 'first_name'];
    const headerMap = HeaderMapper.createHeaderMap(headers);

    const row = ['Sharma', 'stu_123', 'Aarav'];
    const record = HeaderMapper.rowToRecord(headerMap, row);

    expect(record.student_id).toBe('stu_123');
    expect(record.first_name).toBe('Aarav');
    expect(record.last_name).toBe('Sharma');

    const serializedRow = HeaderMapper.recordToRow(headerMap, headers, record);
    expect(serializedRow).toEqual(row);
  });

  it('generates collision-resistant unique identifiers with proper prefixes', () => {
    const studentId = IdGenerator.generateStudentId();
    const paymentId = IdGenerator.generatePaymentId();
    const classId = IdGenerator.generateClassSessionId();

    expect(studentId.startsWith('stu_')).toBe(true);
    expect(paymentId.startsWith('pay_')).toBe(true);
    expect(classId.startsWith('cls_')).toBe(true);

    const set = new Set();
    for (let i = 0; i < 50; i++) {
      set.add(IdGenerator.generatePaymentId());
    }
    expect(set.size).toBe(50);
  });
});
