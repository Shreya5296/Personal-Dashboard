import React from 'react';
import { Button } from '../../components/buttons/Button';

export interface ExportActionProps {
  onExport: () => void;
  label?: string;
}

export const ExportAction: React.FC<ExportActionProps> = ({ onExport, label = 'Export CSV' }) => {
  return (
    <Button variant="outline" size="sm" onClick={onExport}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <span>{label}</span>
    </Button>
  );
};
