import React from 'react';
import { FinanceFilter } from './financeTypes';
import { Button } from '../../components/buttons/Button';

export interface FinanceToolbarProps {
  filter: FinanceFilter;
  onFilterChange: (newFilter: FinanceFilter) => void;
  onExportCsv: () => void;
  onRecordPayment?: () => void;
  isExporting?: boolean;
}

export const FinanceToolbar: React.FC<FinanceToolbarProps> = ({
  filter,
  onFilterChange,
  onExportCsv,
  onRecordPayment,
  isExporting = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-4)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
        <input
          type="search"
          placeholder="Search by student name or reference…"
          value={filter.search || ''}
          onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
          style={{
            padding: '0.45rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            fontSize: 'var(--font-size-sm)',
            backgroundColor: 'var(--color-bg-surface)',
            color: 'var(--color-text-main)',
            minWidth: '220px',
            flex: '1 1 220px',
          }}
        />

        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <label style={{ fontSize: 'var(--font-size-xs)', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-muted)' }}>
            <span>From:</span>
            <input
              type="date"
              value={filter.startDate || ''}
              onChange={(e) => onFilterChange({ ...filter, startDate: e.target.value })}
              style={dateInputStyle}
            />
          </label>
          <label style={{ fontSize: 'var(--font-size-xs)', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-muted)' }}>
            <span>To:</span>
            <input
              type="date"
              value={filter.endDate || ''}
              onChange={(e) => onFilterChange({ ...filter, endDate: e.target.value })}
              style={dateInputStyle}
            />
          </label>
          {(filter.startDate || filter.endDate || filter.search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFilterChange({})}
              style={{ fontSize: 'var(--font-size-xs)', padding: '0.25rem 0.5rem' }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <Button variant="outline" size="sm" onClick={onExportCsv} disabled={isExporting}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Export Finances CSV</span>
        </Button>
        {onRecordPayment && (
          <Button variant="primary" size="sm" onClick={onRecordPayment}>
            + Record Payment
          </Button>
        )}
      </div>
    </div>
  );
};

const dateInputStyle: React.CSSProperties = {
  padding: '0.375rem 0.5rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  fontSize: 'var(--font-size-xs)',
  backgroundColor: 'var(--color-bg-surface)',
  color: 'var(--color-text-main)',
};
