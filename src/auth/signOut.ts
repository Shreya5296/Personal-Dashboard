import { clearStoredToken } from './identityToken';

export function handleSignOut(): void {
  clearStoredToken();
}
