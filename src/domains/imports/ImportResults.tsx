import React from 'react';
import { ImportExecutionResult } from './importTypes';
import { Button } from '../../components/buttons/Button';

export interface ImportResultsProps {
  result: ImportExecutionResult;
  onReset: () => void;
}

export const ImportResults: React.FC<ImportResultsProps> = ({ result, onReset }) => {
  return (
    <div style={{
      backgroundColor: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-6)',
      textAlign: 'center',
    }}>
      <h3 style={{ margin: '0 0 var(--space-2)' }}>Import Completed Successfully</h3>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
        Batch ID: <code>{result.batchId}</code>
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        <div>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Imported</span>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-primary)' }}>
            {result.importedCount}
          </div>
        </div>
        <div>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Skipped / Duplicates</span>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-text-muted)' }}>
            {result.skippedCount}
          </div>
        </div>
        <div>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Errors</span>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-danger)' }}>
            {result.errorCount}
          </div>
        </div>
      </div>

      <Button variant="primary" onClick={onReset}>
        Import Another File
      </Button>
    </div>
  );
};
