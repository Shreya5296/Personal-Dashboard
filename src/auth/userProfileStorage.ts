/**
 * userProfileStorage: Safe persistence for administrator profile display preferences.
 * Persists display name to localStorage (survives tab close and subsequent sessions)
 * and updates sessionStorage (in-session user snapshot).
 * Never stores tokens or sensitive credentials.
 */

const DISPLAY_NAME_KEY = 'smd_admin_display_name';
const USER_KEY = 'smd_auth_user';

let inMemoryDisplayName: string | null = null;

export function getSavedDisplayName(): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(DISPLAY_NAME_KEY);
      if (saved && saved.trim()) {
        return saved.trim();
      }
    }
  } catch {
    // Storage access restricted
  }
  return inMemoryDisplayName;
}

export function saveDisplayName(name: string): void {
  const trimmed = name.trim();
  inMemoryDisplayName = trimmed || null;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DISPLAY_NAME_KEY, trimmed);
    }
  } catch {
    // Storage write restricted
  }

  try {
    if (typeof sessionStorage !== 'undefined') {
      const stored = sessionStorage.getItem(USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.name = trimmed;
        sessionStorage.setItem(USER_KEY, JSON.stringify(parsed));
      }
    }
  } catch {
    // Session storage write restricted
  }
}

export function clearSavedDisplayName(): void {
  inMemoryDisplayName = null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(DISPLAY_NAME_KEY);
    }
  } catch {
    // Storage remove restricted
  }
}

export function resolveDisplayName(candidateName?: string | null, email?: string | null): string {
  const saved = getSavedDisplayName();
  if (saved) {
    return saved;
  }

  if (candidateName && candidateName.trim() && candidateName.trim().toLowerCase() !== 'administrator') {
    return candidateName.trim();
  }

  if (email && email.includes('@')) {
    const localPart = email.split('@')[0].trim();
    if (localPart) {
      return localPart;
    }
  }

  return 'Admin';
}
