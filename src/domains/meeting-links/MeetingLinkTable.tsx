import React from 'react';
import { MeetingLink } from './meetingLinkTypes';
import { detectMeetingPlatform } from './platformDetector';
import { MeetingPlatformBadge } from './MeetingPlatformBadge';
import { Button } from '../../components/buttons/Button';
import { CopyIcon, ExternalLinkIcon } from '../../components/icons/ActionIcons';
import { DataTable, Column } from '../../components/tables/DataTable';

export interface MeetingLinkTableProps {
  links: MeetingLink[];
  onEdit: (link: MeetingLink) => void;
  onAddSlot: (link: MeetingLink, slot: 'primary' | 'secondary') => void;
  onCopy: (key: string, url: string) => void;
  copiedKey: string | null;
}

export const MeetingLinkTable: React.FC<MeetingLinkTableProps> = ({
  links,
  onEdit,
  onAddSlot,
  onCopy,
  copiedKey,
}) => {
  const renderLinkCell = (
    link: MeetingLink,
    rawUrl: string | undefined,
    slot: 'primary' | 'secondary',
    copySuffix: string
  ) => {
    const cleanUrl = (rawUrl || '').trim();
    const exists = cleanUrl !== '' && cleanUrl !== '-' && cleanUrl !== '—';
    const platform = exists ? detectMeetingPlatform(cleanUrl) : null;
    const isCopied = copiedKey === `${link.meeting_link_id}_${copySuffix}`;

    if (!exists) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>
            No link configured
          </span>
          <Button variant="secondary" size="sm" onClick={() => onAddSlot(link, slot)}>
            Add Meeting Link
          </Button>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {platform && <MeetingPlatformBadge info={platform} />}
          <span
            title={cleanUrl}
            style={{
              fontSize: 'var(--font-size-xs)',
              fontFamily: 'monospace',
              maxWidth: '220px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {cleanUrl}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Button variant="ghost" size="sm" onClick={() => onCopy(`${link.meeting_link_id}_${copySuffix}`, cleanUrl)}>
            <CopyIcon size={12} /> {isCopied ? 'Copied' : 'Copy'}
          </Button>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-primary)',
              fontWeight: 600,
              textDecoration: 'none',
              padding: '2px 6px',
            }}
          >
            <ExternalLinkIcon size={12} /> Open ↗
          </a>
        </div>
      </div>
    );
  };

  const columns: Column<MeetingLink>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (l) => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--color-text-main)', display: 'block' }}>
            {l.student_name || l.student_id || 'Global / Unassigned'}
          </span>
          {l.student_id && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', fontFamily: 'monospace' }}>
              {l.student_id}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'primary_link',
      header: 'Primary Meeting Link',
      render: (l) => renderLinkCell(l, l.meeting_link_1 || l.meeting_url, 'primary', '1'),
    },
    {
      key: 'secondary_link',
      header: 'Secondary Meeting Link',
      render: (l) => renderLinkCell(l, l.meeting_link_2, 'secondary', '2'),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (l) => (
        <Button variant="outline" size="sm" onClick={() => onEdit(l)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
      <DataTable columns={columns} data={links} keyExtractor={(l) => l.meeting_link_id || l.student_id || ''} />
    </div>
  );
};
