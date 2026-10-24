import React, { useEffect, useState } from 'react';
import { subscribeScheduleProgress } from '../../domains/students/asyncScheduleWorker';
import { ScheduleProgress } from '../../domains/students/asyncScheduleTypes';

export const SchedulingProgressToast: React.FC = () => {
  const [progress, setProgress] = useState<ScheduleProgress>({
    status: 'idle', studentName: '', current: 0, total: 0,
    createdCount: 0, skippedCount: 0, message: '',
  });

  useEffect(() => {
    return subscribeScheduleProgress((p) => setProgress(p));
  }, []);

  if (progress.status === 'idle' || !progress.message) return null;

  const isRunning = progress.status === 'running';
  const isError = progress.status === 'error';
  const bgColor = isError ? 'var(--color-danger-bg)' : isRunning ? '#eff6ff' : '#ecfdf5';
  const borderColor = isError ? 'var(--color-danger-border)' : isRunning ? '#93c5fd' : '#a7f3d0';
  const textColor = isError ? 'var(--color-danger-text)' : isRunning ? '#1e40af' : '#065f46';
  const pct = progress.total > 0 ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 0;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        color: textColor,
        borderRadius: 'var(--radius-lg)',
        padding: '12px 18px',
        boxShadow: 'var(--shadow-lg)',
        maxWidth: '380px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontSize: 'var(--font-size-xs)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 'var(--font-size-sm)' }}>
          {isError ? 'Scheduling Failed' : isRunning ? 'Scheduling in Progress' : 'Scheduling Completed'}
        </strong>
        {isRunning && <span style={{ fontWeight: 600 }}>{pct}%</span>}
      </div>

      <div>{progress.message}</div>

      {isRunning && (
        <div style={{ height: '4px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              backgroundColor: isError ? 'var(--color-danger)' : 'var(--color-primary)',
              transition: 'width 0.2s ease',
            }}
          />
        </div>
      )}
    </div>
  );
};
