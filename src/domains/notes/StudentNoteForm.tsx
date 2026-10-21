import React, { useState } from 'react';
import { StudentNoteInput } from './noteTypes';
import { FormField } from '../../components/forms/FormField';
import { Button } from '../../components/buttons/Button';
import formStyles from '../../components/forms/forms.module.css';

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
  const [noteType, setNoteType] = useState('GENERAL');
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
          className={formStyles.select}
          value={noteType}
          onChange={(e) => setNoteType(e.target.value)}
        >
          <option value="GENERAL">General Observation</option>
          <option value="CLASS">Class & Homework</option>
          <option value="FEE">Fee & Billing Discussion</option>
          <option value="FOLLOW_UP">Follow-Up Item</option>
          <option value="OTHER">Other Note</option>
        </select>
      </FormField>

      <FormField label="Note Details" required error={error}>
        <textarea
          className={formStyles.textarea}
          rows={3}
          value={content}
          onChange={(e) => { setContent(e.target.value); setError(null); }}
          placeholder="Record notes on student progress, homework status, or parent discussions…"
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
