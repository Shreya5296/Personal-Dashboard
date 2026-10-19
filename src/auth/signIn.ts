import { AuthUser } from './authState';
import { storeToken } from './identityToken';

export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
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
  const payload = parseJwtPayload(token);
  const email = (payload?.email as string) || 'admin@example.com';
  const name = (payload?.name as string) || (payload?.email ? (payload.email as string).split('@')[0] : 'Administrator');
  const picture = payload?.picture as string | undefined;

  return {
    email,
    name,
    picture,
    isAdmin: true,
  };
}

export function handleSuccessfulSignIn(token: string, remember = true): AuthUser {
  const user = buildUserFromToken(token);
  storeToken(token, remember);
  return user;
}
