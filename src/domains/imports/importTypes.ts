export interface ImportRow {
  rowNumber: number;
  fullName: string;
  email?: string;
  phone?: string;
  courseName?: string;
  feeAmount?: number;
  isDuplicate?: boolean;
  validationError?: string;
}

export interface ImportPreviewResult {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  errorRows: number;
  rows: ImportRow[];
}

export interface ImportExecutionResult {
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  batchId: string;
}
