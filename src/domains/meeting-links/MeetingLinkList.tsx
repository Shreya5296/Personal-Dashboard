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

export const MeetingLinkList: React.FC<{ studentId?: string }> = ({ studentId }) => {
  const { token } = useAuth();
  const [links, setLinks] = useState<MeetingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchMeetingLinks(studentId, token);
      setLinks(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentId, token]);

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

  const columns: Column<MeetingLink>[] = [
    { key: 'provider', header: 'Provider', render: (l) => <MeetingProviderLabel provider={l.provider} /> },
    { key: 'label', header: 'Label', render: (l) => l.label || 'Standard Link' },
    {
      key: 'url',
      header: 'URL',
      render: (l) => (
        <a href={l.meeting_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
          Open Link ↗
        </a>
      ),
    },
    {
      key: 'preferred',
      header: 'Preferred',
      render: (l) => (
        <button
          type="button"
          onClick={() => handleTogglePreferred(l)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}
        >
          {l.is_preferred ? '⭐ Primary' : '☆ Make Primary'}
        </button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h4 style={{ margin: 0 }}>Registered Meeting Links</h4>
        <Button variant="secondary" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : '+ Add Meeting Link'}
        </Button>
      </div>

      {isAdding && (
        <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
          <MeetingLinkForm studentId={studentId} onSubmit={handleCreate} onCancel={() => setIsAdding(false)} isLoading={formLoading} />
        </div>
      )}

      {loading && <LoadingState message="Loading meeting links…" />}
      {!loading && links.length === 0 && <EmptyState title="No meeting links" description="Add a Google Meet or Zoom link." />}
      {!loading && links.length > 0 && <DataTable columns={columns} data={links} keyExtractor={(l) => l.meeting_link_id} />}
    </div>
  );
};
