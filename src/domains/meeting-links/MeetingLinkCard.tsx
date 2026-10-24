import React from 'react';
import { MeetingLink } from './meetingLinkTypes';
import { MeetingLinkSlot } from './MeetingLinkSlot';
import { Button } from '../../components/buttons/Button';

export interface MeetingLinkCardProps {
  link: MeetingLink;
  onEdit: (link: MeetingLink) => void;
  onAddSlot: (link: MeetingLink, slot: 'primary' | 'secondary') => void;
  onCopy: (key: string, url: string) => void;
  copiedKey: string | null;
}

export const MeetingLinkCard: React.FC<MeetingLinkCardProps> = ({
  link,
  onEdit,
  onAddSlot,
  onCopy,
  copiedKey,
}) => {
  const primaryUrl = link.meeting_link_1 || link.meeting_url || '';
  const secondaryUrl = link.meeting_link_2 || '';
  const studentName = link.student_name || link.student_id || 'Global / Unassigned';

  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-4)',
        boxShadow: 'var(--shadow-xs)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          borderBottom: '1px solid var(--color-border-subtle)',
          paddingBottom: 'var(--space-2)',
        }}
      >
        <div>
          <h4 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-main)' }}>
            {studentName}
          </h4>
          {link.student_id && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', fontFamily: 'monospace' }}>
              {link.student_id}
            </span>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={() => onEdit(link)}>
          Edit
        </Button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        <MeetingLinkSlot
          slotTitle="Primary Meeting Link"
          url={primaryUrl}
          onAdd={() => onAddSlot(link, 'primary')}
          onCopy={(u) => onCopy(`${link.meeting_link_id}_1`, u)}
          isCopied={copiedKey === `${link.meeting_link_id}_1`}
        />

        <MeetingLinkSlot
          slotTitle="Secondary Meeting Link"
          url={secondaryUrl}
          onAdd={() => onAddSlot(link, 'secondary')}
          onCopy={(u) => onCopy(`${link.meeting_link_id}_2`, u)}
          isCopied={copiedKey === `${link.meeting_link_id}_2`}
        />
      </div>
    </div>
  );
};
