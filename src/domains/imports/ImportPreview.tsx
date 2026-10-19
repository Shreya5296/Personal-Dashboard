import React from 'react';
import { ImportPreviewResult, ImportRow } from './importTypes';
import { DataTable, Column } from '../../components/tables/DataTable';
import { Button } from '../../components/buttons/Button';

export interface ImportPreviewProps {
  preview: ImportPreviewResult;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ImportPreview: React.FC<ImportPreviewProps> = ({
  preview,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const columns: Column<ImportRow>[] = [
    { key: 'rowNumber', header: 'Row #' },
    { key: 'fullName', header: 'Student Name' },
    { key: 'email', header: 'Email', render: (r) => r.email || '—' },
    { key: 'phone', header: 'Phone', render: (r) => r.phone || '—' },
    {
      key: 'status',
      header: 'Validation',
      render: (r) => {
        if (r.validationError) {
          return <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>⚠️ {r.validationError}</span>;
        }
        if (r.isDuplicate) {
          return <span style={{ color: 'var(--color-warning-text)', fontSize: 'var(--font-size-xs)' }}>ℹ️ Existing Student</span>;
        }
        return <span style={{ color: 'var(--color-success-text)', fontSize: 'var(--font-size-xs)' }}>✓ Ready</span>;
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
        <span>Total: <strong>{preview.totalRows}</strong></span>
        <span>Valid: <strong style={{ color: 'var(--color-primary)' }}>{preview.validRows}</strong></span>
        <span>Duplicates: <strong style={{ color: 'var(--color-text-muted)' }}>{preview.duplicateRows}</strong></span>
        <span>Errors: <strong style={{ color: 'var(--color-danger)' }}>{preview.errorRows}</strong></span>
      </div>

      <DataTable columns={columns} data={preview.rows} keyExtractor={(r) => r.rowNumber.toString()} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
        <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onConfirm} isLoading={isLoading} disabled={preview.validRows === 0}>
          Confirm & Import {preview.validRows} Records
        </Button>
      </div>
    </div>
  );
};
