import { describe, it, expect, beforeEach } from 'vitest';
import { MockSpreadsheet } from '../mocks/MockSpreadsheet';

// @ts-ignore
import SheetRegistry from '../../02-backend/apps-script/sheets/SheetRegistry.gs';
// @ts-ignore
import SpreadsheetBootstrap from '../../02-backend/apps-script/sheets/SpreadsheetBootstrap.gs';
// @ts-ignore
import SpreadsheetProvider from '../../02-backend/apps-script/sheets/SpreadsheetProvider.gs';
// @ts-ignore
import ApiEntry from '../../02-backend/apps-script/api/ApiEntry.gs';

describe('ApiEntry — Web App Request/Response Flow', () => {
  beforeEach(() => {
    const spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');
    SpreadsheetProvider.setMockSpreadsheet(spreadsheet);
  });

  it('handles valid authorized doPost for system.health', () => {
    const req = {
      postData: {
        contents: JSON.stringify({
          apiVersion: '1',
          operation: 'system.health',
          requestId: 'req_test_h',
          identityToken: 'mock_token_for_admin@example.com',
          payload: {}
        })
      }
    };

    const res = ApiEntry.doPost(req);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.status).toBe('ok');
    expect(res.payload.data.apiVersion).toBe('1');
    expect(res.payload.error).toBe(null);
  });

  it('rejects unauthorized caller with FORBIDDEN', () => {
    const req = {
      postData: {
        contents: JSON.stringify({
          apiVersion: '1',
          operation: 'system.health',
          requestId: 'req_test_u',
          identityToken: 'mock_token_for_stranger@example.com',
          payload: {}
        })
      }
    };

    const res = ApiEntry.doPost(req);
    expect(res.payload.success).toBe(false);
    expect(res.payload.error.code).toBe('FORBIDDEN');
  });

  it('rejects missing token with UNAUTHORIZED', () => {
    const req = {
      postData: {
        contents: JSON.stringify({
          apiVersion: '1',
          operation: 'system.health',
          requestId: 'req_test_m',
          payload: {}
        })
      }
    };

    const res = ApiEntry.doPost(req);
    expect(res.payload.success).toBe(false);
    expect(res.payload.error.code).toBe('UNAUTHORIZED');
  });

  it('returns safe liveness check for doGet', () => {
    const res = ApiEntry.doGet({});
    expect(res.payload.status).toBe('ok');
    expect(res.payload.apiVersion).toBe('1');
  });
});
