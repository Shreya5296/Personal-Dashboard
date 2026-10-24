import { getSavedTimezone } from './userPreferences';

export function formatDate(isoString: string | null | undefined, timeZone?: string): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: timeZone || getSavedTimezone(),
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return '—';
  }
}

export function formatDateTime(isoString: string | null | undefined, timeZone?: string): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: timeZone || getSavedTimezone(),
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return '—';
  }
}

export function formatTimeOnly(isoString: string | null | undefined, timeZone?: string): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: timeZone || getSavedTimezone(),
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return '—';
  }
}

export function toInputDateFormat(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isPastDate(dateString: string): boolean {
  if (!dateString) return false;
  const target = new Date(dateString);
  const now = new Date();
  return target.getTime() < now.getTime();
}
