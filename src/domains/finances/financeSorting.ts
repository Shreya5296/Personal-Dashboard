import { Payment } from './financeTypes';

export function sortPaymentsByDateAscending(payments: Payment[]): Payment[] {
  return [...payments].sort((a, b) => {
    const timeA = a.payment_date ? new Date(a.payment_date).getTime() : NaN;
    const timeB = b.payment_date ? new Date(b.payment_date).getTime() : NaN;
    const validA = !isNaN(timeA);
    const validB = !isNaN(timeB);

    if (validA && validB) {
      if (timeA !== timeB) return timeA - timeB;
      const idA = a.payment_id || '';
      const idB = b.payment_id || '';
      if (idA !== idB) return idA.localeCompare(idB);
      return (a.student_id || '').localeCompare(b.student_id || '');
    }

    if (!validA && !validB) {
      return (a.payment_id || '').localeCompare(b.payment_id || '');
    }
    return validA ? -1 : 1;
  });
}
