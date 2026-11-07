import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { MeetingLink, MeetingLinkInput } from './meetingLinkTypes';
import { fetchMeetingLinks, createMeetingLink, deleteMeetingLink } from './meetingLinkApi';
import { fetchStudents } from '../students/studentApi';
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
      const [data, studentList] = await Promise.all([
        fetchMeetingLinks(studentId, token),
        fetchStudents({}, token).catch(() => []),
      ]);
      const matched = studentId ? studentList.filter((s) => s.student_id === studentId) : studentList;
      const active = matched.filter((s) => {
        const st = (s.status || '').trim().toUpperCase();
        return st === 'ACTIVE' || (!st && (s as unknown as { is_active?: boolean }).is_active !== false);
      });
      const existingIds = new Set(data.map((l) => l.student_id));
      const placeholders: MeetingLink[] = active
        .filter((s) => !existingIds.has(s.student_id))
        .map((s) => ({
          meeting_link_id: `pending_${s.student_id}`,
          student_id: s.student_id,
          student_name: s.student_name || s.full_name || s.student_id,
          meeting_link_1: '',
          meeting_link_2: '',
          meeting_url: '',
          is_preferred: false,
          provider: 'OTHER',
        }));
      setLinks([...data, ...placeholders]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [studentId, token]);

  const handleSave = async (input: MeetingLinkInput) => {
    setFormLoading(true);
    try {
      await createMeetingLink(input, token);
      setIsModalOpen(false); setEditingLink(null); setTargetSlot(null);
      setFeedback('Meeting link saved successfully.');
      setTimeout(() => setFeedback(null), 3000);
      await loadData();
    } finally {
      setFormLoading(false);
    }
  };

  const handleCopy = (key: string, url: string) => {
    if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(url).catch(() => {});
    setCopiedKey(key);
    setFeedback('Meeting link copied to clipboard.');
    setTimeout(() => { setCopiedKey(null); setFeedback(null); }, 2500);
  };

  const handleDeleteSlot = async (link: MeetingLink, slot: 'primary' | 'secondary') => {
    if (formLoading || !link.student_id) return;
    const slotLabel = slot === 'primary' ? 'primary' : 'secondary';
    const name = link.student_name || link.student_id;
    if (!window.confirm(`Delete ${slotLabel} meeting link for ${name}?`)) return;

    setFormLoading(true);
    try {
      const field = slot === 'primary' ? 'meeting_link_1' : 'meeting_link_2';
      await deleteMeetingLink(link.student_id, field, token);
      setFeedback(`${slot === 'primary' ? 'Primary' : 'Secondary'} meeting link deleted.`);
      setTimeout(() => setFeedback(null), 3000);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      setFeedback(`Failed to delete link: ${message}`);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Registered Meeting Links</h3>
        <Button variant="secondary" size="sm" onClick={() => { setEditingLink(null); setTargetSlot(null); setIsModalOpen(true); }}>
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
          onEdit={(l) => { setEditingLink(l); setTargetSlot(null); setIsModalOpen(true); }}
          onAddSlot={(l, s) => { setEditingLink(l); setTargetSlot(s); setIsModalOpen(true); }}
          onCopy={handleCopy}
          onDeleteLink={handleDeleteSlot}
          copiedKey={copiedKey}
        />
      )}

      <MeetingLinkModal
        isOpen={isModalOpen}
        studentId={studentId}
        initialLink={editingLink}
        targetSlot={targetSlot}
        onSubmit={handleSave}
        onClose={() => { setIsModalOpen(false); setEditingLink(null); setTargetSlot(null); }}
        isLoading={formLoading}
      />
    </div>
  );
};
