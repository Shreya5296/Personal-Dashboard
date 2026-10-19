export function isValidHttpsUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') return false;
  try {
    const parsed = new URL(urlString.trim());
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sanitizeUrl(urlString: string): string {
  if (!isValidHttpsUrl(urlString)) return '';
  return urlString.trim();
}
