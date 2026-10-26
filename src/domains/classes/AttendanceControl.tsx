import React, { useState } from 'react';
import { AttendanceStatus } from './classTypes';
import { Button } from '../../components/buttons/Button';
import { ConfirmDialog } from '../../components/overlays/ConfirmDialog';
import { getSessionStatusStyle } from './sessionStatusStyles';

export interface AttendanceControlProps {
  status: string;
  creditEffect: string;
  onUpdateStatus: (outcome: AttendanceStatus) => Promise<void>;
  onRestoreCredit: () => Promise<void>;
}

export const AttendanceControl: React.FC<AttendanceControlProps> = ({
  status,
  creditEffect,
  onUpdateStatus,
  onRestoreCredit,
}) => {
  const [loading, setLoading] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const handleAction = async (outcome: AttendanceStatus) => {
    setLoading(true);
    try {
      await onUpdateStatus(outcome);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRestore = async () => {
    setLoading(true);
    try {
      await onRestoreCredit();
      setShowRestoreConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'SCHEDULED' || status === 'NOT_MARKED') {
    return (
      <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
        <Button variant="primary" size="sm" onClick={() => handleAction('PRESENT')} disabled={loading}>
          Attended
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleAction('NO_SHOW')} disabled={loading}>
          No-Show
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleAction('CANCELLED')} disabled={loading}>
          Cancel
        </Button>
      </div>
    );
  }

  const statusStyle = getSessionStatusStyle(status, status);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <span style={statusStyle.badgeStyle}>
        {status}
      </span>
      {creditEffect === 'CONSUME' && (
        <Button variant="outline" size="sm" onClick={() => setShowRestoreConfirm(true)} disabled={loading}>
          Restore Credit
        </Button>
      )}

      <ConfirmDialog
        isOpen={showRestoreConfirm}
        title="Restore 1 Class Credit?"
        message="Restore 1 package credit for this session? The student's remaining package balance will increase by 1."
        confirmLabel="Restore Credit"
        isLoading={loading}
        onConfirm={handleConfirmRestore}
        onCancel={() => setShowRestoreConfirm(false)}
      />
    </div>
  );
};
