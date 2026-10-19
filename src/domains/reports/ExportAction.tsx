import React from 'react';
import { Button } from '../../components/buttons/Button';

export interface ExportActionProps {
  onExport: () => void;
  label?: string;
}

export const ExportAction: React.FC<ExportActionProps> = ({ onExport, label = 'Export CSV' }) => {
  return (
    <Button variant="outline" onClick={onExport}>
      📥 {label}
    </Button>
  );
};
