import React from 'react';
import { isValidHttpsUrl } from '../../lib/urlSafety';
import { Button } from '../../components/buttons/Button';

export interface MeetingLinkActionProps {
  url?: string;
}

export const MeetingLinkAction: React.FC<MeetingLinkActionProps> = ({ url }) => {
  if (!url || !isValidHttpsUrl(url)) {
    return <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>No link</span>;
  }

  const handleJoin = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button variant="primary" onClick={handleJoin} style={{ padding: '0.25rem 0.5rem', fontSize: 'var(--font-size-xs)' }}>
      🚀 Join Class
    </Button>
  );
};
