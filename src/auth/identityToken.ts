const TOKEN_KEY = 'smd_auth_token';
const USER_KEY = 'smd_auth_user';

let inMemoryToken: string | null = null;

export function getStoredToken(): string | null {
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(TOKEN_KEY)) {
      return sessionStorage.getItem(TOKEN_KEY);
    }
    if (typeof localStorage !== 'undefined' && localStorage.getItem(TOKEN_KEY)) {
      return localStorage.getItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage read restriction
  }
  return inMemoryToken;
}

export function storeToken(token: string, remember = false): void {
  inMemoryToken = token;
  try {
    if (remember && typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    } else if (typeof sessionStorage !== 'undefined') {
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
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  } catch {
    // Ignore storage clear restriction
  }
}
