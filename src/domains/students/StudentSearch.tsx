import React from 'react';

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
    <div style={{
      display: 'flex',
      gap: 'var(--space-3)',
      marginBottom: 'var(--space-4)',
      alignItems: 'center',
      flexWrap: 'wrap',
    }}>
      <input
        type="text"
        placeholder="Search students by name, email, or phone…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        style={{
          flex: 1,
          minWidth: '240px',
          padding: '0.5rem 0.75rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border-strong)',
          fontSize: 'var(--font-size-sm)',
        }}
      />
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        style={{
          padding: '0.5rem 0.75rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border-strong)',
          fontSize: 'var(--font-size-sm)',
          backgroundColor: 'var(--color-bg-surface)',
        }}
      >
        <option value="">All Statuses</option>
        <option value="ACTIVE">Active Only</option>
        <option value="ARCHIVED">Archived Only</option>
      </select>
    </div>
  );
};
