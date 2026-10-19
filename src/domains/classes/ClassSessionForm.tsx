import React, { useState } from 'react';
import { ClassSessionInput } from './classTypes';
import { FormField } from '../../components/forms/FormField';
import { Button } from '../../components/buttons/Button';

export interface ClassSessionFormProps {
  studentId: string;
  packageId?: string;
  meetingLinkId?: string;
  onSubmit: (input: ClassSessionInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ClassSessionForm: React.FC<ClassSessionFormProps> = ({
  studentId,
  packageId,
  meetingLinkId,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [topic, setTopic] = useState('Weekly Live Class');
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const [startTime, setStartTime] = useState(now.toISOString().slice(0, 16));
  const [durationMinutes, setDurationMinutes] = useState(60);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      student_id: studentId,
      package_id: packageId || undefined,
      meeting_link_id: meetingLinkId || undefined,
      topic: topic.trim(),
      start_time: new Date(startTime).toISOString(),
      duration_minutes: Number(durationMinutes),
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <FormField label="Topic / Session Name" required>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Linear Algebra Chapter 3"
          style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' }}
        />
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <FormField label="Start Date & Time" required>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' }}
          />
        </FormField>
        <FormField label="Duration (Minutes)" required>
          <input
            type="number"
            min={15}
            max={360}
            step={15}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 60)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' }}
          />
        </FormField>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" isLoading={isLoading}>
          Schedule Class
        </Button>
      </div>
    </form>
  );
};
