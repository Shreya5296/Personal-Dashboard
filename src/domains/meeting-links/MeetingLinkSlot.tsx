import React from 'react';
import { detectMeetingPlatform } from './platformDetector';
import { MeetingPlatformBadge } from './MeetingPlatformBadge';
import { Button } from '../../components/buttons/Button';
import { CopyIcon } from '../../components/icons/ActionIcons';

export interface MeetingLinkSlotProps {
  slotTitle: 'Primary Meeting Link' | 'Secondary Meeting Link';
  url: string | null | undefined;
  onAdd: () => void;
  onCopy: (url: string) => void;
  isCopied: boolean;
}

export const MeetingLinkSlot: React.FC<MeetingLinkSlotProps> = ({
  slotTitle,
  url,
  onAdd,
  onCopy,
  isCopied,
}) => {
  const cleanUrl = (url || '').trim();
  const exists = cleanUrl !== '' && cleanUrl !== '-' && cleanUrl !== '—';
  const platform = exists ? detectMeetingPlatform(cleanUrl) : null;

  return (
    <div
      style={{
        flex: 1,
        minWidth: '240px',
        padding: 'var(--space-3)',
        backgroundColor: 'var(--color-bg-subtle)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 'var(--space-2)',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            {slotTitle}
          </span>
          {platform && <MeetingPlatformBadge info={platform} />}
        </div>

        {exists ? (
          <div
            title={cleanUrl}
            style={{
              fontSize: 'var(--font-size-xs)',
              wordBreak: 'break-all',
              color: 'var(--color-text-main)',
              fontFamily: 'monospace',
              lineHeight: 1.4,
              maxHeight: '3.6em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {cleanUrl}
          </div>
        ) : (
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', fontStyle: 'italic', margin: '4px 0' }}>
            No link configured
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: '4px' }}>
        {exists ? (
          <Button variant="ghost" size="sm" onClick={() => onCopy(cleanUrl)}>
            <CopyIcon size={12} /> {isCopied ? 'Copied' : 'Copy'}
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={onAdd}>
            Add Meeting Link
          </Button>
        )}
      </div>
    </div>
  );
};
