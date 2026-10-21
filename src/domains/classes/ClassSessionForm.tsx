import React, { useState, useEffect } from 'react';
import { ClassSessionInput } from './classTypes';
import { FormField } from '../../components/forms/FormField';
import { Button } from '../../components/buttons/Button';
import { fetchStudents } from '../students/studentApi';
import { Student } from '../students/studentTypes';
import { useAuth } from '../../auth/AuthProvider';
import formStyles from '../../components/forms/forms.module.css';

export interface ClassSessionFormProps {
  studentId?: string;
  packageId?: string;
  meetingLinkId?: string;
  onSubmit: (input: ClassSessionInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ClassSessionForm: React.FC<ClassSessionFormProps> = ({
  studentId: initialStudentId,
  packageId,
  meetingLinkId,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { token } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState(
    initialStudentId && initialStudentId !== 'stu_general' ? initialStudentId : ''
  );
  const [students, setStudents] = useState<Student[]>([]);
  const [topic, setTopic] = useState('Weekly Live Class');
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const [startTime, setStartTime] = useState(now.toISOString().slice(0, 16));
  const [durationMinutes, setDurationMinutes] = useState(60);

  useEffect(() => {
    if (!initialStudentId || initialStudentId === 'stu_general') {
      fetchStudents({}, token).then((data) => {
        setStudents(data);
        if (data.length > 0 && !selectedStudentId) {
          setSelectedStudentId(data[0].student_id);
        }
      });
    }
  }, [initialStudentId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    await onSubmit({
      student_id: selectedStudentId,
      package_id: packageId || undefined,
      meeting_link_id: meetingLinkId || undefined,
      topic: topic.trim(),
      start_time: new Date(startTime).toISOString(),
      duration_minutes: Number(durationMinutes),
    });
  };

  const showStudentPicker = !initialStudentId || initialStudentId === 'stu_general';

  return (
    <form noValidate onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {showStudentPicker && (
        <FormField label="Select Student" required>
          <select
            className={formStyles.select}
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            {students.length === 0 && <option value="">No students available</option>}
            {students.map((s) => (
              <option key={s.student_id} value={s.student_id}>
                {s.student_name || s.full_name || s.student_id}
              </option>
            ))}
          </select>
        </FormField>
      )}

      <FormField label="Topic / Session Name" required>
        <input
          className={formStyles.input}
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Calculus: Derivatives Review"
        />
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Start Date & Time" required>
          <input
            className={formStyles.input}
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </FormField>
        <FormField label="Duration (Minutes)" required>
          <input
            className={formStyles.input}
            type="number"
            min={15}
            max={360}
            step={15}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 60)}
          />
        </FormField>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
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
