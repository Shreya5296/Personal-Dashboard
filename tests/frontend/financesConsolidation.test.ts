import { describe, it, expect } from 'vitest';
import { ROUTE_CONFIGS } from '../../src/app/routeAccess';
import { exportFinancesCsv } from '../../src/domains/finances/financeCsvExport';
import { FinancialSummary, Payment } from '../../src/domains/finances/financeTypes';

describe('Finances Consolidation & Single Financial Place', () => {
  it('registers finances route with admin authorization', () => {
    const financesRoute = ROUTE_CONFIGS.finances;
    expect(financesRoute).toBeDefined();
    expect(financesRoute.id).toBe('finances');
    expect(financesRoute.title).toBe('Finances');
    expect(financesRoute.requiresAdmin).toBe(true);
    expect(financesRoute.subtitle).toContain('tuition');
  });

  it('preserves legacy route configurations for fees and reports as aliases', () => {
    expect(ROUTE_CONFIGS.fees).toBeDefined();
    expect(ROUTE_CONFIGS.fees.requiresAdmin).toBe(true);
    expect(ROUTE_CONFIGS.reports).toBeDefined();
    expect(ROUTE_CONFIGS.reports.requiresAdmin).toBe(true);
  });

  it('formats CSV export with financial summary and payment records correctly', () => {
    const summary: FinancialSummary = {
      totalInvoiced: 216800,
      totalCollected: 166800,
      totalOutstanding: 50000,
      currency: 'INR',
    };

    const payments: Payment[] = [
      {
        payment_id: 'pay_001',
        student_id: 'STU_001',
        student_name: 'Rehaan',
        amount: 25000,
        currency: 'INR',
        payment_date: '2026-04-01',
        payment_method: 'UPI',
        reference_number: 'REF_123',
        status: 'RECORDED',
      },
    ];

    let clicked = false;
    let exportedUri = '';
    let exportedDownload = '';

    const mockElement = {
      setAttribute: (name: string, value: string) => {
        if (name === 'href') exportedUri = value;
        if (name === 'download') exportedDownload = value;
      },
      click: () => { clicked = true; },
    };

    const mockDocument = {
      createElement: () => mockElement,
      body: {
        appendChild: () => {},
        removeChild: () => {},
      },
    };

    (globalThis as any).document = mockDocument;

    try {
      exportFinancesCsv(summary, payments);
      expect(clicked).toBe(true);
      expect(exportedDownload).toContain('finances_report_');
      const decoded = decodeURIComponent(exportedUri.replace('data:text/csv;charset=utf-8,', ''));
      expect(decoded).toContain('--- FINANCIAL SUMMARY ---');
      expect(decoded).toContain('Total Invoiced / Package Value,216800,INR');
      expect(decoded).toContain('Collected Earnings,166800,INR');
      expect(decoded).toContain('Total Outstanding,50000,INR');
      expect(decoded).toContain('--- TRANSACTION RECORDS ---');
      expect(decoded).toContain('2026-04-01,"Rehaan","STU_001",25000,INR,"UPI","REF_123",RECORDED');
    } finally {
      delete (globalThis as any).document;
    }
  });
});
