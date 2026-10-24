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
    case 'RECORDED':
      return { label: 'Received', tone: 'neutral' };
    case 'ARCHIVED':
      return { label: 'ARCHIVED', tone: 'neutral' };
    case 'PARTIALLY_PAID':
      return { label: 'PARTIALLY PAID', tone: 'warning' };
    case 'SCHEDULED':
    case 'PENDING':
      return { label: upper.replace('_', ' '), tone: 'warning' };
    case 'INACTIVE':
      return { label: 'INACTIVE', tone: 'danger' };
    case 'OVERDUE':
    case 'CANCELLED':
    case 'VOID':
    case 'NO_SHOW':
      return { label: upper.replace('_', ' '), tone: 'danger' };
    default:
      return { label: upper, tone: 'neutral' };
  }
}
