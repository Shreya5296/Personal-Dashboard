import { describe, it, expect, beforeEach } from 'vitest';
import { parseJwtPayload, buildUserFromToken, handleSuccessfulSignIn } from '../../src/auth/signIn';
import { handleSignOut } from '../../src/auth/signOut';
import { getStoredToken, clearStoredToken } from '../../src/auth/identityToken';

describe('Frontend Authentication Logic', () => {
  beforeEach(() => {
    clearStoredToken();
  });

  it('parses JWT payload safely', () => {
    // Header: {"alg":"HS256","typ":"JWT"}, Payload: {"email":"admin@example.com","name":"Admin User","exp":1999999999}
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwibmFtZSI6IkFkbWluIFVzZXIiLCJleHAiOjE5OTk5OTk5OTl9.signature';
    const payload = parseJwtPayload(token);
    expect(payload?.email).toBe('admin@example.com');
    expect(payload?.name).toBe('Admin User');
  });

  it('handles invalid JWT gracefully', () => {
    expect(parseJwtPayload('invalid.token')).toBeNull();
    expect(parseJwtPayload('')).toBeNull();
  });

  it('builds an AuthUser with admin access from token', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwibmFtZSI6IkFkbWluIFVzZXIifQ.sig';
    const user = buildUserFromToken(token);
    expect(user.email).toBe('admin@example.com');
    expect(user.isAdmin).toBe(true);
  });

  it('stores and clears token in web storage', () => {
    expect(getStoredToken()).toBeNull();
    handleSuccessfulSignIn('test_token_123');
    expect(getStoredToken()).toBe('test_token_123');
    handleSignOut();
    expect(getStoredToken()).toBeNull();
  });
});
