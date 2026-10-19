import React, { useState } from 'react';
import { AttendanceStatus } from './classTypes';
import { Button } from '../../components/buttons/Button';

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

  const handleAction = async (outcome: AttendanceStatus) => {
    setLoading(true);
    try {
      await onUpdateStatus(outcome);
    } finally {
      setLoading(false);
    }
  };

  const handleCreditBack = async () => {
    if (confirm('Restore 1 package credit for this session?')) {
      setLoading(true);
      try {
        await onRestoreCredit();
      } finally {
        setLoading(false);
      }
    }
  };

  if (status === 'SCHEDULED') {
    return (
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Button variant="primary" onClick={() => handleAction('ATTENDED')} disabled={loading} style={{ padding: '2px 8px', fontSize: 'var(--font-size-xs)' }}>
          Attended
        </Button>
        <Button variant="outline" onClick={() => handleAction('NO_SHOW')} disabled={loading} style={{ padding: '2px 8px', fontSize: 'var(--font-size-xs)' }}>
          No-Show
        </Button>
        <Button variant="outline" onClick={() => handleAction('CANCELLED')} disabled={loading} style={{ padding: '2px 8px', fontSize: 'var(--font-size-xs)' }}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
        {status}
      </span>
      {creditEffect === 'CONSUME' && (
        <Button variant="outline" onClick={handleCreditBack} disabled={loading} style={{ padding: '2px 6px', fontSize: 'var(--font-size-xs)' }}>
          Restore Credit
        </Button>
      )}
    </div>
  );
};
