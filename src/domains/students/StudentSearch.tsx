import React from 'react';
import { SearchIcon } from '../../components/icons/ActionIcons';
import formStyles from '../../components/forms/forms.module.css';

export interface StudentSearchProps {
  query: string;
  statusFilter: string;
  onQueryChange: (query: string) => void;
  onStatusFilterChange: (status: string) => void;
}

export const StudentSearch: React.FC<StudentSearchProps> = ({
  query,
  statusFilter,
  onQueryChange,
  onStatusFilterChange,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-2)',
        alignItems: 'center',
        flexWrap: 'wrap',
        flex: 1,
        maxWidth: '520px',
      }}
    >
      <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
        <div
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-subtle)',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <SearchIcon size={16} />
        </div>
        <input
          type="text"
          placeholder="Search students by name, email, or phone…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className={formStyles.input}
          style={{
            width: '100%',
            padding: '0.4375rem 0.75rem 0.4375rem 2.25rem',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
          }}
        />
      </div>

      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        aria-label="Filter students by status"
        className={formStyles.select}
        style={{
          width: 'auto',
          minWidth: '140px',
          padding: '0.4375rem 2.25rem 0.4375rem 0.75rem',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        <option value="">All Statuses</option>
        <option value="ACTIVE">Active Only</option>
        <option value="INACTIVE">Inactive Only</option>
      </select>
    </div>
  );
};
