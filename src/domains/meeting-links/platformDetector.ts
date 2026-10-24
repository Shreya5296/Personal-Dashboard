export type MeetingPlatformType = 'GOOGLE_MEET' | 'ZOOM' | 'OTHER';

export interface PlatformInfo {
  platform: MeetingPlatformType;
  label: 'Google Meet' | 'Zoom' | 'Other meeting platform';
  dotColor: string;
  badgeBg: string;
  badgeText: string;
}

export function detectMeetingPlatform(rawUrl: string | null | undefined): PlatformInfo | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed === '-' || trimmed === '—') return null;

  try {
    const urlObj = new URL(trimmed);
    if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
      return null;
    }

    const hostname = urlObj.hostname.toLowerCase();
    if (!hostname) return null;

    // Google Meet: meet.google.com or subdomains
    if (hostname === 'meet.google.com' || hostname.endsWith('.meet.google.com')) {
      return {
        platform: 'GOOGLE_MEET',
        label: 'Google Meet',
        dotColor: '#059669',
        badgeBg: '#ecfdf5',
        badgeText: '#065f46',
      };
    }

    // Zoom: zoom.us, subdomains (*.zoom.us), or zoomgov (*.zoomgov.com)
    if (
      hostname === 'zoom.us' ||
      hostname.endsWith('.zoom.us') ||
      hostname === 'zoomgov.com' ||
      hostname.endsWith('.zoomgov.com')
    ) {
      return {
        platform: 'ZOOM',
        label: 'Zoom',
        dotColor: '#2563eb',
        badgeBg: '#eff6ff',
        badgeText: '#1d4ed8',
      };
    }

    // Other valid meeting platform
    return {
      platform: 'OTHER',
      label: 'Other meeting platform',
      dotColor: '#7c3aed',
      badgeBg: '#f5f3ff',
      badgeText: '#6d28d9',
    };
  } catch {
    return null;
  }
}
