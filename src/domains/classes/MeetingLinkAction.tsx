import React from 'react';
import { isValidHttpsUrl } from '../../lib/urlSafety';
import { Button } from '../../components/buttons/Button';
import { ExternalLinkIcon } from '../../components/icons/ActionIcons';

export interface MeetingLinkActionProps {
  url?: string;
}

export const MeetingLinkAction: React.FC<MeetingLinkActionProps> = ({ url }) => {
  if (!url || !isValidHttpsUrl(url)) {
    return <span style={{ color: 'var(--color-text-subtle)', fontSize: 'var(--font-size-xs)' }}>—</span>;
  }

  const handleJoin = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button variant="secondary" size="sm" onClick={handleJoin}>
      <ExternalLinkIcon size={12} />
      <span>Join Class</span>
    </Button>
  );
};
