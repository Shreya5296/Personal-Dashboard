import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { MeetingLink, MeetingLinkInput } from './meetingLinkTypes';
import { fetchMeetingLinks, createMeetingLink, updateMeetingLink } from './meetingLinkApi';
import { MeetingProviderLabel } from './MeetingProviderLabel';
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
  const [formLoading, setFormLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCreate = async (input: MeetingLinkInput) => {
    setFormLoading(true);
    try {
      await createMeetingLink(input, token);
      setIsAdding(false);
      await loadData();
    } finally {
      setFormLoading(false);
    }
  };

  const handleTogglePreferred = async (link: MeetingLink) => {
    await updateMeetingLink(link.meeting_link_id, { is_preferred: !link.is_preferred }, token);
    await loadData();
  };

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
    { key: 'provider', header: 'Provider', render: (l) => <MeetingProviderLabel provider={l.provider} /> },
    { key: 'label', header: 'Label', render: (l) => <span style={{ fontWeight: 500 }}>{l.link_label || l.label || 'Standard Link'}</span> },
    {
      key: 'url',
      header: 'Meeting URL',
      render: (l) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Button variant="secondary" size="sm" onClick={() => handleCopy(l.meeting_link_id, l.meeting_url)}>
            <CopyIcon size={12} /> {copiedId === l.meeting_link_id ? 'Copied!' : 'Copy'}
          </Button>
          <a href={l.meeting_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', fontWeight: 600 }}>
            <ExternalLinkIcon size={12} /> Open ↗
          </a>
        </div>
      ),
    },
    {
      key: 'preferred',
      header: 'Priority',
      render: (l) => (
        <button
          type="button"
          onClick={() => handleTogglePreferred(l)}
          style={{
            background: l.is_preferred ? 'var(--color-primary-bg)' : 'transparent',
            border: `1px solid ${l.is_preferred ? 'var(--color-primary-border)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-full)',
            padding: '2px 8px',
            cursor: 'pointer',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
            color: l.is_preferred ? 'var(--color-primary)' : 'var(--color-text-muted)',
          }}
        >
          {l.is_preferred ? 'Primary Link' : 'Set as Primary'}
        </button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h4 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Registered Meeting Links</h4>
        <Button variant="secondary" size="sm" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : '+ Add Meeting Link'}
        </Button>
      </div>

      {isAdding && (
        <div style={{ padding: '1.25rem', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-xl)', marginBottom: 'var(--space-5)', boxShadow: 'var(--shadow-sm)' }}>
          <MeetingLinkForm studentId={studentId} onSubmit={handleCreate} onCancel={() => setIsAdding(false)} isLoading={formLoading} />
        </div>
      )}

      {loading && <LoadingState message="Loading meeting links…" />}
      {!loading && links.length === 0 && <EmptyState title="No meeting links configured" description="Add Google Meet or Zoom links to quickly connect with students during classes." />}
      {!loading && links.length > 0 && <DataTable columns={columns} data={links} keyExtractor={(l) => l.meeting_link_id} />}
    </div>
  );
};
