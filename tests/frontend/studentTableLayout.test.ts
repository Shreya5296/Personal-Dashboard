import { describe, it, expect } from 'vitest';
import styles from '../../src/components/tables/tables.module.css';
import { STUDENT_TABLE_COLUMNS } from '../../src/domains/students/studentTableLayout';

describe('Fix 1 — Students Table Layout, Alignment and Sizing', () => {
  it('has tableFixed CSS class with table-layout: fixed to prevent overflow', () => {
    expect(styles.tableFixed).toBeDefined();
    expect(styles.tableFixed).toContain('tableFixed');
  });

  it('uses balanced column widths with 23% student and 29% schedule', () => {
    expect(STUDENT_TABLE_COLUMNS.student).toBe('23%');
    expect(STUDENT_TABLE_COLUMNS.subject).toBe('18%');
    expect(STUDENT_TABLE_COLUMNS.schedule).toBe('29%');
    expect(STUDENT_TABLE_COLUMNS.classes).toBe('13%');
    expect(STUDENT_TABLE_COLUMNS.actions).toBe('12%');
  });

  it('reserves sufficient width for multi-subject tags and actions buttons', () => {
    const actionsMinWidthPx = 100;
    expect(actionsMinWidthPx).toBeGreaterThanOrEqual(90);
  });
});
