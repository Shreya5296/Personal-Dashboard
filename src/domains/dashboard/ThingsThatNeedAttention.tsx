import React from 'react';
import { NavSection } from '../../layout/Sidebar';
import { AttentionAlert } from './attentionAlerts';
import { Button } from '../../components/buttons/Button';

export interface ThingsThatNeedAttentionProps {
  alerts: AttentionAlert[];
  onNavigate: (section: NavSection) => void;
  error?: string | null;
}

export const ThingsThatNeedAttention: React.FC<ThingsThatNeedAttentionProps> = ({
  alerts,
  onNavigate,
  error,
}) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.25rem 1.5rem',
        boxShadow: 'var(--shadow-xs)',
        marginTop: 'var(--space-6)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
            Things That Need Attention
          </h3>
          {alerts.length > 0 && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-warning-bg)',
                color: 'var(--color-warning-text)',
                border: '1px solid var(--color-warning-border)',
              }}
            >
              {alerts.length}
            </span>
          )}
        </div>
      </div>

      {error ? (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--color-danger-bg)',
            color: 'var(--color-danger-text)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          ⚠️ Failed to load attention alerts: {error}
        </div>
      ) : alerts.length === 0 ? (
        <div
          style={{
            padding: 'var(--space-4) 0',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          <span style={{ color: 'var(--color-success)', fontWeight: 600, marginRight: '6px' }}>✓</span>
          Everything is up to date. No pending issues requiring attention.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {alerts.map((alert) => {
            const isDanger = alert.severity === 'danger';
            return (
              <div
                key={alert.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isDanger ? '#fef2f2' : 'var(--color-bg-subtle)',
                  border: `1px solid ${isDanger ? '#fecaca' : 'var(--color-border-subtle)'}`,
                  flexWrap: 'wrap',
                  gap: 'var(--space-2)',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)', display: 'block' }}>
                    {alert.studentName}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: isDanger ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                    {alert.reason}
                  </span>
                </div>

                <Button
                  variant={isDanger ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => onNavigate(alert.targetSection)}
                >
                  {alert.actionLabel} →
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
