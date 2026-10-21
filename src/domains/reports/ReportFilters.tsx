import React from 'react';
import { ReportFilter } from './reportTypes';

export interface ReportFiltersProps {
  filter: ReportFilter;
  onChange: (filter: ReportFilter) => void;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({ filter, onChange }) => {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
      <label style={{ fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)' }}>
        <span>From:</span>
        <input
          type="date"
          value={filter.startDate || ''}
          onChange={(e) => onChange({ ...filter, startDate: e.target.value })}
          style={{
            padding: '0.375rem 0.625rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            fontSize: 'var(--font-size-xs)',
            backgroundColor: 'var(--color-bg-surface)',
            color: 'var(--color-text-main)',
          }}
        />
      </label>
      <label style={{ fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)' }}>
        <span>To:</span>
        <input
          type="date"
          value={filter.endDate || ''}
          onChange={(e) => onChange({ ...filter, endDate: e.target.value })}
          style={{
            padding: '0.375rem 0.625rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            fontSize: 'var(--font-size-xs)',
            backgroundColor: 'var(--color-bg-surface)',
            color: 'var(--color-text-main)',
          }}
        />
      </label>
    </div>
  );
};
