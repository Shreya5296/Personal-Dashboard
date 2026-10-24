import { cleanTime } from '../domains/classes/scheduleApi';

/**
 * Converts a 24-hour time string ("16:00", "09:30") to 12-hour format with AM/PM ("4:00 PM", "9:30 AM").
 */
export function formatTimeTo12Hour(timeStr: string | null | undefined): string {
  if (!timeStr) return '—';
  const clean = cleanTime(timeStr);
  if (!clean || !clean.includes(':')) {
    if (/am|pm/i.test(timeStr)) return timeStr.trim();
    return timeStr;
  }

  const [hStr, mStr] = clean.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  if (isNaN(h)) return timeStr;

  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;

  const minStr = String(m).padStart(2, '0');
  return `${h}:${minStr} ${period}`;
}

/**
 * Formats a start and end time pair into a 12-hour range string ("4:00 PM – 4:40 PM").
 */
export function formatTimeRange12Hour(startStr?: string | null, endStr?: string | null): string {
  if (!startStr) return '—';
  const start12 = formatTimeTo12Hour(startStr);
  if (!endStr) return start12;
  const end12 = formatTimeTo12Hour(endStr);
  return `${start12} – ${end12}`;
}

/**
 * Formats an ISO string or Date into 12-hour format with AM/PM in the specified timezone.
 */
export function formatIsoTo12Hour(isoString: string | null | undefined, timeZone = 'Asia/Kolkata'): string {
  if (!isoString) return '—';
  try {
    const clean = String(isoString).trim().replace(/T\s+(\d:)/, 'T0$1');
    const d = new Date(clean);
    if (isNaN(d.getTime())) return '—';

    return new Intl.DateTimeFormat('en-IN', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return '—';
  }
}

/**
 * Formats an ISO string into Date + 12-hour time ("25 Oct 2026, 4:00 PM").
 */
export function formatDateTime12Hour(isoString: string | null | undefined, timeZone = 'Asia/Kolkata'): string {
  if (!isoString) return '—';
  try {
    const clean = String(isoString).trim().replace(/T\s+(\d:)/, 'T0$1');
    const d = new Date(clean);
    if (isNaN(d.getTime())) return '—';

    return new Intl.DateTimeFormat('en-IN', {
      timeZone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return '—';
  }
}
