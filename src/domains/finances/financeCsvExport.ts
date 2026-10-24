import { FinancialSummary, Payment } from './financeTypes';

export function exportFinancesCsv(summary: FinancialSummary | null, payments: Payment[]): void {
  const dateStr = new Date().toISOString().slice(0, 10);
  const rows: string[] = [];

  rows.push('--- FINANCIAL SUMMARY ---');
  rows.push('Metric,Amount,Currency');
  rows.push(`Total Invoice,${summary?.totalInvoiced ?? 0},${summary?.currency ?? 'INR'}`);
  rows.push(`Collected Earnings,${summary?.totalCollected ?? 0},${summary?.currency ?? 'INR'}`);
  rows.push(`Total Outstanding,${summary?.totalOutstanding ?? 0},${summary?.currency ?? 'INR'}`);
  rows.push('');

  rows.push('--- TRANSACTION RECORDS ---');
  rows.push('Date,Student Name,Student ID,Amount,Currency,Payment Method,Reference Number,Status');

  for (const p of payments) {
    const pDate = p.payment_date ? String(p.payment_date).slice(0, 10) : '';
    const name = `"${(p.student_name || '').replace(/"/g, '""')}"`;
    const sid = `"${(p.student_id || '').replace(/"/g, '""')}"`;
    const amt = p.amount || 0;
    const curr = p.currency || 'INR';
    const method = `"${(p.payment_method || '').replace(/"/g, '""')}"`;
    const ref = `"${(p.reference_number || p.payment_id || '').replace(/"/g, '""')}"`;
    const rawStatus = (p.status || p.payment_status || 'RECORDED').toUpperCase();
    const status = rawStatus === 'RECORDED' ? 'Received' : (p.status || p.payment_status || 'Received');

    rows.push(`${pDate},${name},${sid},${amt},${curr},${method},${ref},${status}`);
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  link.setAttribute('download', `finances_report_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
