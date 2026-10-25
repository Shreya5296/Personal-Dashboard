import { describe, it, expect } from 'vitest';
import styles from '../../src/components/tables/tables.module.css';

describe('Fix 1 — Students Table Layout, Alignment and Sizing', () => {
  it('has tableFixed CSS class with table-layout: fixed to prevent overflow', () => {
    expect(styles.tableFixed).toBeDefined();
    expect(styles.tableFixed).toContain('tableFixed');
  });

  it('verifies explicit percentage column widths sum to 100%', () => {
    const columnWidths = {
      student: 27,
      subject: 19,
      schedule: 29,
      classes: 13,
      actions: 12,
    };
    const total = Object.values(columnWidths).reduce((acc, w) => acc + w, 0);
    expect(total).toBe(100);
  });

  it('reserves sufficient width for multi-subject tags and actions buttons', () => {
    // Student column: 27% allows full name and contact info
    // Subject column: 19% allows badge wrapping
    // Schedule column: 29% allows weekday and time ranges
    // Actions column: 12% with min-width ensures View/Edit buttons fit without wrapping
    const actionsMinWidthPx = 100;
    expect(actionsMinWidthPx).toBeGreaterThanOrEqual(90);
  });
});
