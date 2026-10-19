import React, { useState } from 'react';
import { StudentNoteInput } from './noteTypes';
import { FormField } from '../../components/forms/FormField';
import { Button } from '../../components/buttons/Button';

export interface StudentNoteFormProps {
  studentId: string;
  onSubmit: (input: StudentNoteInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const StudentNoteForm: React.FC<StudentNoteFormProps> = ({
  studentId,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState('ACADEMIC');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Note content cannot be empty.');
      return;
    }
    await onSubmit({
      student_id: studentId,
      note_type: noteType,
      content: content.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <FormField label="Note Category">
        <select
          value={noteType}
          onChange={(e) => setNoteType(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-surface)' }}
        >
          <option value="ACADEMIC">Academic Progress</option>
          <option value="BEHAVIORAL">Behavior & Engagement</option>
          <option value="FOLLOW_UP">Follow-Up Item</option>
          <option value="PARENT_COMMUNICATION">Parent Communication</option>
        </select>
      </FormField>

      <FormField label="Note Details" required error={error}>
        <textarea
          rows={3}
          value={content}
          onChange={(e) => { setContent(e.target.value); setError(null); }}
          placeholder="Record notes on student progress, homework status, or parent discussions…"
          style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)', fontFamily: 'var(--font-sans)' }}
        />
      </FormField>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" isLoading={isLoading}>
          Save Note
        </Button>
      </div>
    </form>
  );
};
