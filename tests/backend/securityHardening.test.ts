import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockSpreadsheet } from '../mocks/MockSpreadsheet';

// @ts-ignore
import SheetRegistry from '../../02-backend/apps-script/sheets/SheetRegistry.gs';
// @ts-ignore
import SpreadsheetBootstrap from '../../02-backend/apps-script/sheets/SpreadsheetBootstrap.gs';
// @ts-ignore
import SpreadsheetProvider from '../../02-backend/apps-script/sheets/SpreadsheetProvider.gs';
// @ts-ignore
import ApiEntry from '../../02-backend/apps-script/api/ApiEntry.gs';
// @ts-ignore
import IdentityVerifier from '../../02-backend/apps-script/auth/IdentityVerifier.gs';
// @ts-ignore
import TokenValidation from '../../02-backend/apps-script/auth/TokenValidation.gs';
// @ts-ignore
import AuthService from '../../02-backend/apps-script/auth/AuthService.gs';
// @ts-ignore
import AdminAuthorization from '../../02-backend/apps-script/auth/AdminAuthorization.gs';

describe('Zero-GCP Backend Security Hardening & Session Authentication', () => {
  let spreadsheet: MockSpreadsheet;
  const originalUrlFetchApp = (globalThis as unknown as { UrlFetchApp?: unknown }).UrlFetchApp;
  const testSecretKey = 'test_admin_secret_key_123';
  const adminEmail = 'ashreya0502@gmail.com';

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');
    SpreadsheetProvider.setMockSpreadsheet(spreadsheet);
  });

  afterEach(() => {
    if (originalUrlFetchApp !== undefined) {
      (globalThis as unknown as { UrlFetchApp?: unknown }).UrlFetchApp = originalUrlFetchApp;
    } else {
      delete (globalThis as unknown as { UrlFetchApp?: unknown }).UrlFetchApp;
    }
  });

  it('authenticates admin with valid key and issues cryptographically signed HMAC token', () => {
    const loginRes = AuthService.handleAuthLogin({ key: testSecretKey });
    expect(loginRes.success).toBe(true);
    expect(loginRes.data.user.email).toBe(adminEmail);
    expect(loginRes.data.user.isAdmin).toBe(true);
    expect(loginRes.data.token).toContain('.');

    // Token must validate correctly
    const validation = TokenValidation.validateHmacSessionToken(loginRes.data.token, testSecretKey, [adminEmail]);
    expect(validation.valid).toBe(true);
    expect(validation.email).toBe(adminEmail);
  });

  it('rejects login attempts with invalid administrator access key', () => {
    const loginRes = AuthService.handleAuthLogin({ key: 'wrong_password_attempt' });
    expect(loginRes.success).toBe(false);
    expect(loginRes.code).toBe('UNAUTHORIZED');
  });

  it('rejects tampered token payloads and signatures', () => {
    const validToken = TokenValidation.createHmacSessionToken(adminEmail, testSecretKey);
    const [payloadBase64, sig] = validToken.split('.');

    // Tamper with signature
    const badSigToken = `${payloadBase64}.${sig.substring(0, sig.length - 2)}00`;
    const res1 = TokenValidation.validateHmacSessionToken(badSigToken, testSecretKey, [adminEmail]);
    expect(res1.valid).toBe(false);
    expect(res1.code).toBe('UNAUTHORIZED');
    expect(res1.message).toContain('Invalid token signature');

    // Tamper with payload (elevate privileges or change email)
    const forgedPayload = Buffer.from(JSON.stringify({
      email: 'attacker@evil.com',
      iss: 'personal-dashboard-backend',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).toString('base64');
    const forgedToken = `${forgedPayload}.${sig}`;
    const res2 = TokenValidation.validateHmacSessionToken(forgedToken, testSecretKey, [adminEmail]);
    expect(res2.valid).toBe(false);
    expect(res2.code).toBe('UNAUTHORIZED');
  });

  it('rejects expired session tokens', () => {
    // Issue token with -10 second TTL
    const expiredToken = TokenValidation.createHmacSessionToken(adminEmail, testSecretKey, -10);
    const res = TokenValidation.validateHmacSessionToken(expiredToken, testSecretKey, [adminEmail]);
    expect(res.valid).toBe(false);
    expect(res.code).toBe('UNAUTHORIZED');
    expect(res.message).toContain('expired');
  });

  it('rejects non-allowlisted email addresses even if signature is valid', () => {
    const strangerToken = TokenValidation.createHmacSessionToken('stranger@example.com', testSecretKey);
    const res = TokenValidation.validateHmacSessionToken(strangerToken, testSecretKey, [adminEmail]);
    expect(res.valid).toBe(false);
    expect(res.code).toBe('FORBIDDEN');
  });

  it('strictly rejects synthetic mock tokens in live Google Apps Script runtime', () => {
    (globalThis as unknown as { UrlFetchApp: unknown }).UrlFetchApp = {
      fetch: () => ({ getResponseCode: () => 200, getContentText: () => '{}' }),
    };

    const res = IdentityVerifier.verifyIdentityToken('mock_token_for_admin@example.com');
    expect(res.valid).toBe(false);
    expect(res.code).toBe('UNAUTHORIZED');
    expect(res.message).toContain('Synthetic mock tokens are rejected in production runtime');
  });

  it('executes end-to-end doPost authentication and operation protection', () => {
    // 1. auth.login through doPost
    const loginPost = {
      postData: {
        contents: JSON.stringify({
          apiVersion: '1',
          operation: 'auth.login',
          requestId: 'req_login_test',
          payload: { key: testSecretKey },
        }),
      },
    };
    const loginRes = ApiEntry.doPost(loginPost);
    expect(loginRes.payload.success).toBe(true);
    const token = loginRes.payload.data.token;
    expect(token).toBeTruthy();

    // 2. Protected health operation with valid token
    const healthPost = {
      postData: {
        contents: JSON.stringify({
          apiVersion: '1',
          operation: 'system.health',
          requestId: 'req_health_test',
          identityToken: token,
          payload: {},
        }),
      },
    };
    const healthRes = ApiEntry.doPost(healthPost);
    expect(healthRes.payload.success).toBe(true);
    expect(healthRes.payload.data.status).toBe('ok');

    // 3. Protected operation without token
    const unauthPost = {
      postData: {
        contents: JSON.stringify({
          apiVersion: '1',
          operation: 'system.health',
          requestId: 'req_unauth_test',
          payload: {},
        }),
      },
    };
    const unauthRes = ApiEntry.doPost(unauthPost);
    expect(unauthRes.payload.success).toBe(false);
    expect(unauthRes.payload.error.code).toBe('UNAUTHORIZED');
  });
});
