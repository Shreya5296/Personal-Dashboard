/**
 * Formats consumed and total classes with consistent leading zeros, e.g. '01/48', '00/12', '00/00'.
 */
export function formatClassBalance(consumed: number, total: number): string {
  const safeConsumed = Math.max(0, Math.round(consumed || 0));
  const safeTotal = Math.max(0, Math.round(total || 0));

  if (safeConsumed === 0 && safeTotal === 0) {
    return '00/00';
  }

  const digits = Math.max(2, String(safeTotal).length);
  const formattedConsumed = String(safeConsumed).padStart(digits, '0');
  const formattedTotal = String(safeTotal).padStart(digits, '0');

  return `${formattedConsumed}/${formattedTotal}`;
}
