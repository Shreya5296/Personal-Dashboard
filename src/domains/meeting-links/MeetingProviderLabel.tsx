import React from 'react';

export interface MeetingProviderLabelProps {
  provider: string;
}

export const MeetingProviderLabel: React.FC<MeetingProviderLabelProps> = ({ provider }) => {
  const p = (provider || '').toUpperCase();
  let label = provider || 'Web Meeting';
  let dotColor = 'var(--color-primary)';
  let bg = 'var(--color-primary-bg)';
  let text = 'var(--color-primary)';

  if (p.includes('MEET')) {
    label = 'Google Meet';
    dotColor = '#059669';
    bg = '#ecfdf5';
    text = '#065f46';
  } else if (p.includes('ZOOM')) {
    label = 'Zoom';
    dotColor = '#2563eb';
    bg = '#eff6ff';
    text = '#1d4ed8';
  } else if (p.includes('TEAMS')) {
    label = 'MS Teams';
    dotColor = '#7c3aed';
    bg = '#f5f3ff';
    text = '#6d28d9';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 600,
        backgroundColor: bg,
        color: text,
        padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${dotColor}30`,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: dotColor,
        }}
      />
      <span>{label}</span>
    </span>
  );
};
