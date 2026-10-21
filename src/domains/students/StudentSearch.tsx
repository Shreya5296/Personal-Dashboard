import React from 'react';
import { SearchIcon } from '../../components/icons/ActionIcons';

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
            left: '10px',
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
          style={{
            width: '100%',
            padding: '0.4375rem 0.75rem 0.4375rem 2rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            fontSize: 'var(--font-size-sm)',
            backgroundColor: 'var(--color-bg-surface)',
            color: 'var(--color-text-main)',
            outline: 'none',
          }}
        />
      </div>

      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        aria-label="Filter students by status"
        style={{
          padding: '0.4375rem 0.75rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          fontSize: 'var(--font-size-sm)',
          backgroundColor: 'var(--color-bg-surface)',
          color: 'var(--color-text-main)',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        <option value="">All Statuses</option>
        <option value="ACTIVE">Active Only</option>
        <option value="ARCHIVED">Archived Only</option>
      </select>
    </div>
  );
};
