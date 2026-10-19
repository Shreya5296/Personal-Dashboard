import React from 'react';
import { ReportFilter } from './reportTypes';

export interface ReportFiltersProps {
  filter: ReportFilter;
  onChange: (filter: ReportFilter) => void;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({ filter, onChange }) => {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
      <label style={{ fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        From:
        <input
          type="date"
          value={filter.startDate || ''}
          onChange={(e) => onChange({ ...filter, startDate: e.target.value })}
          style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' }}
        />
      </label>
      <label style={{ fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        To:
        <input
          type="date"
          value={filter.endDate || ''}
          onChange={(e) => onChange({ ...filter, endDate: e.target.value })}
          style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' }}
        />
      </label>
    </div>
  );
};
