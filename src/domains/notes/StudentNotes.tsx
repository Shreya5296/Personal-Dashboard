import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { StudentNote, StudentNoteInput } from './noteTypes';
import { fetchNotes, createNote } from './noteApi';
import { StudentNoteForm } from './StudentNoteForm';
import { formatDateTime } from '../../lib/dateFormat';
import { Button } from '../../components/buttons/Button';
import { LoadingState } from '../../components/feedback/LoadingState';
import { EmptyState } from '../../components/feedback/EmptyState';

export const StudentNotes: React.FC<{ studentId: string }> = ({ studentId }) => {
  const { token } = useAuth();
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchNotes(studentId, token);
      setNotes(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [studentId, token]);

  const handleCreate = async (input: StudentNoteInput) => {
    setFormLoading(true);
    try {
      await createNote(input, token);
      setIsAdding(false);
      await loadData();
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h4 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Progress Notes & Log</h4>
        <Button variant="secondary" size="sm" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : '+ Add Note'}
        </Button>
      </div>

      {isAdding && (
        <div style={{ padding: '1.25rem', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-xl)', marginBottom: 'var(--space-5)', boxShadow: 'var(--shadow-sm)' }}>
          <StudentNoteForm studentId={studentId} onSubmit={handleCreate} onCancel={() => setIsAdding(false)} isLoading={formLoading} />
        </div>
      )}

      {loading && <LoadingState message="Loading notes…" />}
      {!loading && notes.length === 0 && <EmptyState title="No notes recorded" description="Add notes to track learning milestones or parent communications." />}

      {!loading && notes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {notes.map((n) => (
            <div key={n.note_id} style={{ padding: '1.125rem 1.25rem', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-xs)' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-bg)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                  {n.note_type || 'NOTE'}
                </span>
                <span style={{ color: 'var(--color-text-subtle)' }}>{formatDateTime(n.created_at)}</span>
              </div>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {n.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
