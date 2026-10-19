import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { usePageTitle } from '../../hooks/usePageTitle';
import { ImportPreviewResult, ImportExecutionResult, ImportRow } from './importTypes';
import { previewImport, executeImport } from './importApi';
import { ImportPreview } from './ImportPreview';
import { ImportResults } from './ImportResults';
import { Button } from '../../components/buttons/Button';
import { InlineNotice } from '../../components/feedback/InlineNotice';

export const ImportPage: React.FC = () => {
  usePageTitle('Spreadsheet Import & Reconciliation');
  const { token } = useAuth();
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [result, setResult] = useState<ImportExecutionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleParseAndPreview = async () => {
    if (!csvText.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const lines = csvText.trim().split('\n').filter((l) => l.trim().length > 0);
      const rows: Partial<ImportRow>[] = lines.slice(1).map((line, idx) => {
        const parts = line.split(',').map((p) => p.trim());
        return {
          rowNumber: idx + 2,
          fullName: parts[0] || '',
          email: parts[1] || undefined,
          phone: parts[2] || undefined,
          courseName: parts[3] || undefined,
        };
      });

      const previewData = await previewImport(rows, token);
      setPreview(previewData);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to parse import records');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!preview) return;
    setIsLoading(true);
    try {
      const execResult = await executeImport(preview.rows, token);
      setResult(execResult);
      setPreview(null);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to execute import batch');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {errorMessage && <InlineNotice type="danger" message={errorMessage} onDismiss={() => setErrorMessage(null)} />}

      {!preview && !result && (
        <div style={{ backgroundColor: 'var(--color-bg-surface)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)' }}>
          <h3 style={{ margin: '0 0 var(--space-2)' }}>Paste CSV or Spreadsheet Data</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
            Header row required: <code>Full Name, Email, Phone, Course Name</code>
          </p>
          <textarea
            rows={8}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Full Name, Email, Phone, Course Name&#10;Aarav Sharma, aarav@example.com, +91 9876543210, Grade 10 Math&#10;Diya Patel, diya@example.com, +91 9876543211, Grade 9 Science"
            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)', fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)' }}
          />
          <Button variant="primary" onClick={handleParseAndPreview} isLoading={isLoading} disabled={!csvText.trim()}>
            Preview & Validate Import
          </Button>
        </div>
      )}

      {preview && !result && (
        <ImportPreview preview={preview} onConfirm={handleExecute} onCancel={() => setPreview(null)} isLoading={isLoading} />
      )}

      {result && <ImportResults result={result} onReset={() => { setResult(null); setCsvText(''); }} />}
    </div>
  );
};
