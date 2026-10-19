import React, { useState } from 'react';
import { EnrollmentInput } from './enrollmentTypes';
import { FormField } from '../../components/forms/FormField';
import { Button } from '../../components/buttons/Button';
import { toInputDateFormat } from '../../lib/dateFormat';

export interface EnrollmentFormProps {
  studentId: string;
  onSubmit: (input: EnrollmentInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const EnrollmentForm: React.FC<EnrollmentFormProps> = ({
  studentId,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [courseName, setCourseName] = useState('');
  const [levelOrGrade, setLevelOrGrade] = useState('');
  const [startDate, setStartDate] = useState(toInputDateFormat());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) {
      setError('Course name is required.');
      return;
    }
    await onSubmit({
      student_id: studentId,
      course_name: courseName.trim(),
      level_or_grade: levelOrGrade.trim() || undefined,
      start_date: startDate,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <FormField label="Course / Subject" required error={error}>
        <input
          type="text"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          placeholder="e.g. Grade 10 Mathematics, Physics"
          style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' }}
        />
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <FormField label="Grade / Level">
          <input
            type="text"
            value={levelOrGrade}
            onChange={(e) => setLevelOrGrade(e.target.value)}
            placeholder="e.g. CBSE 10th"
            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' }}
          />
        </FormField>
        <FormField label="Start Date" required>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' }}
          />
        </FormField>
      </div>

      <FormField label="Notes">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional enrollment notes"
          style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' }}
        />
      </FormField>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" isLoading={isLoading}>
          Add Enrollment
        </Button>
      </div>
    </form>
  );
};
