import { sendApiRequest } from '../../api/apiClient';
import { ImportPreviewResult, ImportExecutionResult, ImportRow } from './importTypes';

export async function previewImport(
  rows: Partial<ImportRow>[],
  token?: string | null
): Promise<ImportPreviewResult> {
  const response = await sendApiRequest<ImportPreviewResult>(
    'imports.preview',
    { rows },
    { token }
  );
  return response.data || {
    totalRows: 0,
    validRows: 0,
    duplicateRows: 0,
    errorRows: 0,
    rows: [],
  };
}

export async function executeImport(
  rows: Partial<ImportRow>[],
  token?: string | null
): Promise<ImportExecutionResult> {
  const response = await sendApiRequest<ImportExecutionResult>(
    'imports.execute',
    { rows },
    { token }
  );
  return response.data || {
    importedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    batchId: '',
  };
}
