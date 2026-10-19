import React from 'react';
import { formatStatusBadge } from '../../lib/textFormat';

export interface FeeStatusProps {
  status: string;
}

export const FeeStatus: React.FC<FeeStatusProps> = ({ status }) => {
  const badge = formatStatusBadge(status);

  const getStyle = (tone: string) => {
    switch (tone) {
      case 'success':
        return { bg: 'var(--color-success-bg)', text: 'var(--color-success-text)' };
      case 'warning':
        return { bg: 'var(--color-warning-bg)', text: 'var(--color-warning-text)' };
      case 'danger':
        return { bg: 'var(--color-danger-bg)', text: 'var(--color-danger-text)' };
      default:
        return { bg: 'var(--color-bg-subtle)', text: 'var(--color-text-main)' };
    }
  };

  const style = getStyle(badge.tone);

  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      fontSize: 'var(--font-size-xs)',
      fontWeight: 600,
      backgroundColor: style.bg,
      color: style.text,
      display: 'inline-block',
    }}>
      {badge.label}
    </span>
  );
};
