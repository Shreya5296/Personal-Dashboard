export function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trimEnd() + '…';
}

export function formatStatusBadge(status: string | null | undefined): { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' } {
  if (!status) return { label: 'Unknown', tone: 'neutral' };
  const upper = status.toUpperCase();

  switch (upper) {
    case 'ACTIVE':
    case 'PAID':
    case 'ATTENDED':
    case 'COMPLETED':
      return { label: upper, tone: 'success' };
    case 'PARTIALLY_PAID':
    case 'SCHEDULED':
    case 'PENDING':
      return { label: upper.replace('_', ' '), tone: 'warning' };
    case 'OVERDUE':
    case 'CANCELLED':
    case 'VOID':
    case 'NO_SHOW':
    case 'ARCHIVED':
      return { label: upper.replace('_', ' '), tone: 'danger' };
    default:
      return { label: upper, tone: 'neutral' };
  }
}
