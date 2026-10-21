import { describe, it, expect, beforeEach } from 'vitest';
import { MockSpreadsheet } from '../mocks/MockSpreadsheet';

// @ts-ignore
import SheetRegistry from '../../02-backend/apps-script/sheets/SheetRegistry.gs';
// @ts-ignore
import SpreadsheetBootstrap from '../../02-backend/apps-script/sheets/SpreadsheetBootstrap.gs';
// @ts-ignore
import HeaderMapper from '../../02-backend/apps-script/sheets/HeaderMapper.gs';
// @ts-ignore
import RowReader from '../../02-backend/apps-script/sheets/RowReader.gs';
// @ts-ignore
import RowWriter from '../../02-backend/apps-script/sheets/RowWriter.gs';
// @ts-ignore
import LockManager from '../../02-backend/apps-script/sheets/LockManager.gs';
// @ts-ignore
import RequestParser from '../../02-backend/apps-script/api/RequestParser.gs';
// @ts-ignore
import ResponseFactory from '../../02-backend/apps-script/api/ResponseFactory.gs';
// @ts-ignore
import IdentityVerifier from '../../02-backend/apps-script/auth/IdentityVerifier.gs';
// @ts-ignore
import AdminAuthorization from '../../02-backend/apps-script/auth/AdminAuthorization.gs';
// @ts-ignore
import AuditService from '../../02-backend/apps-script/audit/AuditService.gs';
// @ts-ignore
import AuditRepository from '../../02-backend/apps-script/audit/AuditRepository.gs';

describe('Phase 4 — Backend Foundation', () => {
  let spreadsheet: MockSpreadsheet;

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');
  });

  it('parses request envelopes and rejects malformed inputs', () => {
    const emptyRes = RequestParser.parseApiRequest(null);
    expect(emptyRes.valid).toBe(false);
    expect(emptyRes.code).toBe('INVALID_REQUEST');

    const malformedRes = RequestParser.parseApiRequest({ postData: { contents: '{ broken json' } });
    expect(malformedRes.valid).toBe(false);
    expect(malformedRes.code).toBe('INVALID_REQUEST');

    const validRes = RequestParser.parseApiRequest({
      postData: { contents: JSON.stringify({ apiVersion: '1', operation: 'system.health', payload: {} }) }
    });
    expect(validRes.valid).toBe(true);
    expect(validRes.operation).toBe('system.health');
    expect(validRes.requestId.startsWith('req_')).toBe(true);
  });

  it('enforces server-side authentication and admin authorization', () => {
    const unauth = IdentityVerifier.verifyIdentityToken('');
    expect(unauth.valid).toBe(false);
    expect(unauth.code).toBe('UNAUTHORIZED');

    const authAdmin = IdentityVerifier.verifyIdentityToken('mock_token_for_admin@example.com');
    expect(authAdmin.valid).toBe(true);
    expect(AdminAuthorization.isAuthorizedAdmin(authAdmin.email)).toBe(true);

    const authNonAdmin = IdentityVerifier.verifyIdentityToken('mock_token_for_stranger@example.com');
    expect(authNonAdmin.valid).toBe(true);
    expect(AdminAuthorization.isAuthorizedAdmin(authNonAdmin.email)).toBe(false);
  });

  it('safely reads, writes, and updates rows through RowReader and RowWriter', () => {
    const sheet = spreadsheet.getSheetByName('Students');
    const headers = SheetRegistry.getExpectedHeaders('Students');

    RowWriter.appendRecord(sheet, HeaderMapper, headers, {
      student_id: 'stu_001',
      student_name: 'Dev Patel',
      status: 'ACTIVE',
      parent_phone: '+919999999999',
      parent_name: 'Sunita Patel',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const records = RowReader.readAllRecords(sheet, HeaderMapper);
    expect(records.length).toBe(1);
    expect(records[0].student_id).toBe('stu_001');
    expect(records[0].student_name).toBe('Dev Patel');

    RowWriter.updateRecordById(sheet, HeaderMapper, headers, 'student_id', 'stu_001', {
      student_name: 'Deven Patel'
    });

    const updated = RowReader.findRecordById(sheet, HeaderMapper, 'student_id', 'stu_001');
    expect(updated.student_name).toBe('Deven Patel');
  });

  it('executes atomic operations within LockManager with guaranteed release', () => {
    let executed = false;
    const lockResult = LockManager.withLock(5000, () => {
      executed = true;
      return 'lock_success';
    });
    expect(lockResult.success).toBe(true);
    expect(lockResult.result).toBe('lock_success');
    expect(executed).toBe(true);
  });

  it('records sanitized operational audit entries without secrets', () => {
    AuditService.recordAuditEvent(spreadsheet, SheetRegistry, HeaderMapper, {
      actor_id: 'usr_admin',
      actor_email: 'admin@example.com',
      entity_type: 'STUDENT',
      entity_id: 'stu_001',
      action: 'CREATE',
      before_summary: null,
      after_summary: { student_id: 'stu_001', tokenSecret: 'sensitive_jwt_token', name: 'Dev' },
      request_id: 'req_123'
    });

    const auditSheet = spreadsheet.getSheetByName('AuditLog');
    const logs = RowReader.readAllRecords(auditSheet, HeaderMapper);
    expect(logs.length).toBe(1);
    expect(logs[0].entity_id).toBe('stu_001');
    expect(logs[0].after_summary).toContain('[REDACTED]');
    expect(logs[0].after_summary).not.toContain('sensitive_jwt_token');
  });
});
