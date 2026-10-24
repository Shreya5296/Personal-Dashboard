import React from 'react';
import { MeetingLinkButton } from './MeetingLinkButton';

export interface MeetingLinkSlotProps {
  slotTitle: 'Primary Meeting Link' | 'Secondary Meeting Link';
  url: string | null | undefined;
  onAdd?: () => void;
  onCopy: (url: string) => void;
  isCopied: boolean;
}

export const MeetingLinkSlot: React.FC<MeetingLinkSlotProps> = ({
  slotTitle,
  url,
  onCopy,
  isCopied,
}) => {
  const cleanUrl = (url || '').trim();
  const exists = cleanUrl !== '' && cleanUrl !== '-' && cleanUrl !== '—';

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
        </div>

        {exists ? (
          <MeetingLinkButton
            url={cleanUrl}
            isCopied={isCopied}
            onCopy={onCopy}
          />
        ) : (
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', fontStyle: 'italic', margin: '4px 0' }}>
            No link configured
          </div>
        )}
      </div>
    </div>
  );
};
