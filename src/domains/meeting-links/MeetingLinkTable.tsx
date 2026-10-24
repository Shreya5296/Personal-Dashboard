import React from 'react';
import { MeetingLink } from './meetingLinkTypes';
import { MeetingLinkButton } from './MeetingLinkButton';
import { Button } from '../../components/buttons/Button';
import { DataTable, Column } from '../../components/tables/DataTable';

export interface MeetingLinkTableProps {
  links: MeetingLink[];
  onEdit: (link: MeetingLink) => void;
  onAddSlot?: (link: MeetingLink, slot: 'primary' | 'secondary') => void;
  onCopy: (key: string, url: string) => void;
  copiedKey: string | null;
}

export const MeetingLinkTable: React.FC<MeetingLinkTableProps> = ({
  links,
  onEdit,
  onCopy,
  copiedKey,
}) => {
  const renderLinkCell = (
    link: MeetingLink,
    rawUrl: string | undefined,
    copySuffix: string
  ) => {
    const cleanUrl = (rawUrl || '').trim();
    const exists = cleanUrl !== '' && cleanUrl !== '-' && cleanUrl !== '—';
    const isCopied = copiedKey === `${link.meeting_link_id || link.student_id}_${copySuffix}`;

    if (!exists) {
      return (
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>
          No link configured
        </span>
      );
    }

    return (
      <MeetingLinkButton
        url={cleanUrl}
        isCopied={isCopied}
        onCopy={(u) => onCopy(`${link.meeting_link_id || link.student_id}_${copySuffix}`, u)}
      />
    );
  };

  const columns: Column<MeetingLink>[] = [
    {
      key: 'student',
      header: 'Student',
      width: '24%',
      render: (l) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: 'var(--font-size-sm)' }}>
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
      width: '33%',
      render: (l) => renderLinkCell(l, l.meeting_link_1 || l.meeting_url, '1'),
    },
    {
      key: 'secondary_link',
      header: 'Secondary Meeting Link',
      width: '33%',
      render: (l) => renderLinkCell(l, l.meeting_link_2, '2'),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '10%',
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
