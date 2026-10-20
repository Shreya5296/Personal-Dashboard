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
import AdminAuthorization from '../../02-backend/apps-script/auth/AdminAuthorization.gs';

describe('Backend Security Hardening & Token Verification', () => {
  let spreadsheet: MockSpreadsheet;
  const originalUrlFetchApp = (globalThis as unknown as { UrlFetchApp?: unknown }).UrlFetchApp;

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

  it('rejects claims with expired timestamp', () => {
    const expiredClaims = {
      iss: 'accounts.google.com',
      email: 'admin@example.com',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) - 300,
    };
    const res = TokenValidation.validateTokenClaims(expiredClaims, null);
    expect(res.valid).toBe(false);
    expect(res.code).toBe('UNAUTHORIZED');
    expect(res.message).toBe('Token has expired');
  });

  it('rejects claims with invalid issuer', () => {
    const invalidIssuer = {
      iss: 'https://malicious-issuer.com',
      email: 'admin@example.com',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const res = TokenValidation.validateTokenClaims(invalidIssuer, null);
    expect(res.valid).toBe(false);
    expect(res.code).toBe('UNAUTHORIZED');
    expect(res.message).toBe('Invalid token issuer');
  });

  it('rejects unverified Google emails', () => {
    const unverifiedClaims = {
      iss: 'https://accounts.google.com',
      email: 'admin@example.com',
      email_verified: false,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const res = TokenValidation.validateTokenClaims(unverifiedClaims, null);
    expect(res.valid).toBe(false);
    expect(res.code).toBe('UNAUTHORIZED');
    expect(res.message).toBe('Google account email is not verified');
  });

  it('enforces audience matching when Google Client ID is configured', () => {
    const validClaims = {
      iss: 'accounts.google.com',
      email: 'admin@example.com',
      email_verified: true,
      aud: '123456789-target.apps.googleusercontent.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    // Mismatched audience
    const mismatch = TokenValidation.validateTokenClaims(validClaims, 'different-client-id.apps.googleusercontent.com');
    expect(mismatch.valid).toBe(false);
    expect(mismatch.code).toBe('UNAUTHORIZED');
    expect(mismatch.message).toContain('audience does not match');

    // Matching audience
    const match = TokenValidation.validateTokenClaims(validClaims, '123456789-target.apps.googleusercontent.com');
    expect(match.valid).toBe(true);
    expect(match.email).toBe('admin@example.com');
  });

  it('strictly rejects synthetic mock tokens when running in production Apps Script runtime', () => {
    // Simulate Apps Script runtime where UrlFetchApp exists
    (globalThis as unknown as { UrlFetchApp: unknown }).UrlFetchApp = {
      fetch: () => ({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({}),
      }),
    };

    const res = IdentityVerifier.verifyIdentityToken('mock_token_for_admin@example.com');
    expect(res.valid).toBe(false);
    expect(res.code).toBe('UNAUTHORIZED');
    expect(res.message).toContain('Synthetic mock tokens are rejected in production runtime');
  });

  it('rejects unauthorized Google accounts even if identity token is valid', () => {
    expect(AdminAuthorization.isAuthorizedAdmin('stranger@example.com')).toBe(false);
    expect(AdminAuthorization.isAuthorizedAdmin('')).toBe(false);
    expect(AdminAuthorization.isAuthorizedAdmin(null)).toBe(false);
  });
});
