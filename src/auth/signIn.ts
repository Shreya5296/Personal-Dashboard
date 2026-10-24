import { AuthUser } from './authState';
import { storeToken } from './identityToken';
import { resolveDisplayName } from './userProfileStorage';

export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    const base64Url = parts.length === 2 ? parts[0] : (parts.length === 3 ? parts[1] : null);
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function buildUserFromToken(token: string): AuthUser {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const stored = sessionStorage.getItem('smd_auth_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.email) {
          return {
            email: parsed.email,
            name: resolveDisplayName(parsed.name, parsed.email),
            picture: parsed.picture,
            isAdmin: true,
          };
        }
      }
    }
  } catch {
    // Ignore storage parse errors
  }

  const payload = parseJwtPayload(token);
  const email = (payload?.email as string) || 'ashreya0502@gmail.com';
  const name = resolveDisplayName(payload?.name as string | undefined, email);
  const picture = payload?.picture as string | undefined;

  return {
    email,
    name,
    picture,
    isAdmin: true,
  };
}

export function handleSuccessfulSignIn(token: string): AuthUser {
  const user = buildUserFromToken(token);
  storeToken(token);
  return user;
}
