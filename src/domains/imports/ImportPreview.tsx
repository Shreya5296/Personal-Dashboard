import React, { useState } from 'react';
import { ImportPreviewResult, ImportRow } from './importTypes';
import { DataTable, Column } from '../../components/tables/DataTable';
import { Button } from '../../components/buttons/Button';
import { ConfirmDialog } from '../../components/overlays/ConfirmDialog';

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
  const [showConfirm, setShowConfirm] = useState(false);

  const columns: Column<ImportRow>[] = [
    { key: 'rowNumber', header: 'Row #' },
    { key: 'fullName', header: 'Student Name', render: (r) => <strong style={{ color: 'var(--color-text-main)' }}>{r.fullName}</strong> },
    { key: 'email', header: 'Email', render: (r) => r.email || '—' },
    { key: 'phone', header: 'Phone', render: (r) => r.phone || '—' },
    {
      key: 'status',
      header: 'Validation Result',
      render: (r) => {
        if (r.validationError) {
          return (
            <span style={{ color: 'var(--color-danger-text)', backgroundColor: 'var(--color-danger-bg)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
              ⚠️ {r.validationError}
            </span>
          );
        }
        if (r.isDuplicate) {
          return (
            <span style={{ color: 'var(--color-warning-text)', backgroundColor: 'var(--color-warning-bg)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
              ℹ️ Existing Duplicate
            </span>
          );
        }
        return (
          <span style={{ color: 'var(--color-success-text)', backgroundColor: 'var(--color-success-bg)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
            ✓ Ready to Import
          </span>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', padding: '1rem', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--font-size-sm)', flexWrap: 'wrap', boxShadow: 'var(--shadow-xs)' }}>
        <span>Total Rows: <strong>{preview.totalRows}</strong></span>
        <span>Valid Candidates: <strong style={{ color: 'var(--color-primary)' }}>{preview.validRows}</strong></span>
        <span>Duplicate Records: <strong style={{ color: 'var(--color-warning-text)' }}>{preview.duplicateRows}</strong></span>
        <span>Validation Errors: <strong style={{ color: 'var(--color-danger)' }}>{preview.errorRows}</strong></span>
      </div>

      <DataTable columns={columns} data={preview.rows} keyExtractor={(r) => r.rowNumber.toString()} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
        <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
          ← Back to Editor
        </Button>
        <Button variant="primary" onClick={() => setShowConfirm(true)} isLoading={isLoading} disabled={preview.validRows === 0}>
          Confirm & Import {preview.validRows} Records
        </Button>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title={`Confirm Import of ${preview.validRows} Records`}
        message={`Are you sure you want to write ${preview.validRows} validated student record(s) into your database? This will persist new student profiles.`}
        confirmLabel={`Import ${preview.validRows} Records`}
        isLoading={isLoading}
        onConfirm={() => { setShowConfirm(false); onConfirm(); }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
};
