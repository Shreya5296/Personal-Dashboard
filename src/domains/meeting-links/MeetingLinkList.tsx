import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { MeetingLink, MeetingLinkInput } from './meetingLinkTypes';
import { fetchMeetingLinks, createMeetingLink } from './meetingLinkApi';
import { MeetingLinkForm } from './MeetingLinkForm';
import { DataTable, Column } from '../../components/tables/DataTable';
import { Button } from '../../components/buttons/Button';
import { LoadingState } from '../../components/feedback/LoadingState';
import { EmptyState } from '../../components/feedback/EmptyState';
import { CopyIcon, ExternalLinkIcon } from '../../components/icons/ActionIcons';

export const MeetingLinkList: React.FC<{ studentId?: string }> = ({ studentId }) => {
  const { token } = useAuth();
  const [links, setLinks] = useState<MeetingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingLink, setEditingLink] = useState<MeetingLink | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchMeetingLinks(studentId, token);
      setLinks(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [studentId, token]);

  const handleSave = async (input: MeetingLinkInput) => {
    setFormLoading(true);
    try {
      await createMeetingLink(input, token);
      setIsAdding(false);
      setEditingLink(null);
      await loadData();
    } finally {
      setFormLoading(false);
    }
  };

  const handleCopy = (key: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const renderLinkItem = (label: string, url: string, keyId: string) => (
    <div>
      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span style={{ fontSize: 'var(--font-size-xs)', wordBreak: 'break-all', color: 'var(--color-text-main)', flex: 1, minWidth: 0 }}>
          {url}
        </span>
        <Button variant="ghost" size="sm" onClick={() => handleCopy(keyId, url)}>
          <CopyIcon size={12} /> {copiedKey === keyId ? 'Copied' : 'Copy'}
        </Button>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
          <ExternalLinkIcon size={12} /> Open ↗
        </a>
      </div>
    </div>
  );

  const columns: Column<MeetingLink>[] = [
    ...(!studentId ? [{
      key: 'student',
      header: 'Student',
      render: (l: MeetingLink) => (
        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)' }}>
          {l.student_name || l.student_id || 'Global / Unassigned'}
        </span>
      ),
    }] : []),
    {
      key: 'links',
      header: 'Meeting Links',
      render: (l) => {
        const link1 = l.meeting_link_1 || l.meeting_url;
        const link2 = l.meeting_link_2;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '260px' }}>
            {link1 && renderLinkItem('Primary meeting link', link1, `${l.meeting_link_id}_1`)}
            {link2 && link2.trim() && (
              <div style={{ borderTop: '1px dashed var(--color-border-subtle)', paddingTop: '6px' }}>
                {renderLinkItem('Secondary meeting link', link2.trim(), `${l.meeting_link_id}_2`)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (l) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { setEditingLink(l); setIsAdding(true); }}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h4 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Registered Meeting Links</h4>
        <Button variant="secondary" size="sm" onClick={() => { setEditingLink(null); setIsAdding(!isAdding); }}>
          {isAdding ? 'Cancel' : '+ Add Meeting Link'}
        </Button>
      </div>

      {isAdding && (
        <div style={{ padding: '1.25rem', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-xl)', marginBottom: 'var(--space-5)', boxShadow: 'var(--shadow-sm)' }}>
          <MeetingLinkForm studentId={studentId} initialLink={editingLink} onSubmit={handleSave} onCancel={() => { setIsAdding(false); setEditingLink(null); }} isLoading={formLoading} />
        </div>
      )}

      {loading && <LoadingState message="Loading meeting links…" />}
      {!loading && links.length === 0 && <EmptyState title="No meeting links configured" description="Add Google Meet or Zoom links to quickly connect with students during classes." />}
      {!loading && links.length > 0 && <DataTable columns={columns} data={links} keyExtractor={(l) => l.meeting_link_id} />}
    </div>
  );
};
