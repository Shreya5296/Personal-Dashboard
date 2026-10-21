import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { usePageTitle } from '../../hooks/usePageTitle';
import { ImportPreviewResult, ImportExecutionResult, ImportRow } from './importTypes';
import { previewImport, executeImport } from './importApi';
import { ImportPreview } from './ImportPreview';
import { ImportResults } from './ImportResults';
import { Button } from '../../components/buttons/Button';
import { InlineNotice } from '../../components/feedback/InlineNotice';
import { PageHeader } from '../../layout/PageHeader';
import formStyles from '../../components/forms/forms.module.css';

const SAMPLE_CSV = `Full Name,Email,Phone,Course Name
Aarav Sharma,aarav@example.com,+91 9876543210,AP Calculus BC
Diya Patel,diya@example.com,+91 9876543211,IB Physics HL
Kabir Mehta,kabir@example.com,+91 9876543212,Grade 10 Mathematics`;

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

  const activeStep = result ? 3 : preview ? 2 : 1;

  return (
    <div>
      <PageHeader
        title="Spreadsheet Import & Reconciliation"
        subtitle="Batch import student rosters with preview validation, duplicate protection, and row-level feedback."
      />

      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-3)' }}>
        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: activeStep === 1 ? 700 : 500, color: activeStep === 1 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
          1. Paste CSV Data
        </span>
        <span style={{ color: 'var(--color-text-subtle)' }}>→</span>
        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: activeStep === 2 ? 700 : 500, color: activeStep === 2 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
          2. Preview & Reconciliation
        </span>
        <span style={{ color: 'var(--color-text-subtle)' }}>→</span>
        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: activeStep === 3 ? 700 : 500, color: activeStep === 3 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
          3. Summary Results
        </span>
      </div>

      {errorMessage && <InlineNotice type="danger" message={errorMessage} onDismiss={() => setErrorMessage(null)} />}

      {!preview && !result && (
        <div style={{ backgroundColor: 'var(--color-bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border-subtle)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Paste CSV or Spreadsheet Data</h3>
            <Button variant="outline" size="sm" onClick={() => setCsvText(SAMPLE_CSV)}>
              Load Synthetic Sample
            </Button>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', margin: '0 0 var(--space-4)' }}>
            Required header columns: <code>Full Name, Email, Phone, Course Name</code>
          </p>
          <textarea
            className={formStyles.textarea}
            rows={8}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Full Name, Email, Phone, Course Name&#10;Aarav Sharma, aarav@example.com, +91 9876543210, AP Calculus BC"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={handleParseAndPreview} isLoading={isLoading} disabled={!csvText.trim()}>
              Preview & Validate Import
            </Button>
          </div>
        </div>
      )}

      {preview && !result && (
        <ImportPreview preview={preview} onConfirm={handleExecute} onCancel={() => setPreview(null)} isLoading={isLoading} />
      )}

      {result && <ImportResults result={result} onReset={() => { setResult(null); setCsvText(''); }} />}
    </div>
  );
};
