/**
 * identityToken: Secure in-session token storage.
 * Stores tokens ONLY in browser sessionStorage (and memory).
 * Never persists tokens to localStorage or logs tokens to console.
 */

const TOKEN_KEY = 'smd_auth_token';
const USER_KEY = 'smd_auth_user';

let inMemoryToken: string | null = null;

export function getStoredToken(): string | null {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (token) return token;
    }
  } catch {
    // Ignore storage read restriction
  }
  return inMemoryToken;
}

export function storeToken(token: string): void {
  inMemoryToken = token;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  } catch {
    // Ignore storage write restriction
  }
}

export function clearStoredToken(): void {
  inMemoryToken = null;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    }
  } catch {
    // Ignore storage clear restriction
  }
}
