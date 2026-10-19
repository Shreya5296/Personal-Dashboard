import React from 'react';

export interface MeetingProviderLabelProps {
  provider: string;
}

export const MeetingProviderLabel: React.FC<MeetingProviderLabelProps> = ({ provider }) => {
  const p = (provider || '').toUpperCase();
  let emoji = '🔗';
  let label = provider;

  if (p.includes('MEET')) {
    emoji = '🟢';
    label = 'Google Meet';
  } else if (p.includes('ZOOM')) {
    emoji = '🔵';
    label = 'Zoom';
  } else if (p.includes('TEAMS')) {
    emoji = '🟣';
    label = 'MS Teams';
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
      <span>{emoji}</span>
      <span>{label}</span>
    </span>
  );
};
