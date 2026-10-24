import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { MeetingLink, MeetingLinkInput } from './meetingLinkTypes';
import { fetchMeetingLinks, createMeetingLink } from './meetingLinkApi';
import { MeetingLinkTable } from './MeetingLinkTable';
import { MeetingLinkModal } from './MeetingLinkModal';
import { Button } from '../../components/buttons/Button';
import { LoadingState } from '../../components/feedback/LoadingState';
import { EmptyState } from '../../components/feedback/EmptyState';

export const MeetingLinkList: React.FC<{ studentId?: string }> = ({ studentId }) => {
  const { token } = useAuth();
  const [links, setLinks] = useState<MeetingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<MeetingLink | null>(null);
  const [targetSlot, setTargetSlot] = useState<'primary' | 'secondary' | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

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
      setIsModalOpen(false);
      setEditingLink(null);
      setTargetSlot(null);
      setFeedback('Meeting link saved successfully.');
      setTimeout(() => setFeedback(null), 3000);
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

  const openAddSlot = (link: MeetingLink, slot: 'primary' | 'secondary') => {
    setEditingLink(link);
    setTargetSlot(slot);
    setIsModalOpen(true);
  };

  const openEdit = (link: MeetingLink) => {
    setEditingLink(link);
    setTargetSlot(null);
    setIsModalOpen(true);
  };

  const openAddNew = () => {
    setEditingLink(null);
    setTargetSlot(null);
    setIsModalOpen(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Registered Meeting Links</h3>
        <Button variant="secondary" size="sm" onClick={openAddNew}>
          + Add Meeting Link
        </Button>
      </div>

      {feedback && (
        <div style={{ padding: '8px 12px', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
          {feedback}
        </div>
      )}

      {loading && <LoadingState message="Loading meeting links…" />}
      {!loading && links.length === 0 && (
        <EmptyState title="No meeting links configured" description="Add Google Meet or Zoom links to quickly connect with students during classes." />
      )}
      {!loading && links.length > 0 && (
        <MeetingLinkTable
          links={links}
          onEdit={openEdit}
          onAddSlot={openAddSlot}
          onCopy={handleCopy}
          copiedKey={copiedKey}
        />
      )}

      <MeetingLinkModal
        isOpen={isModalOpen}
        studentId={studentId}
        initialLink={editingLink}
        targetSlot={targetSlot}
        onSubmit={handleSave}
        onClose={() => {
          setIsModalOpen(false);
          setEditingLink(null);
          setTargetSlot(null);
        }}
        isLoading={formLoading}
      />
    </div>
  );
};
