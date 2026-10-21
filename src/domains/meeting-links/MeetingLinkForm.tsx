import React, { useState, useEffect } from 'react';
import { MeetingLinkInput } from './meetingLinkTypes';
import { FormField } from '../../components/forms/FormField';
import { Button } from '../../components/buttons/Button';
import { isValidHttpsUrl } from '../../lib/urlSafety';
import { fetchStudents } from '../students/studentApi';
import { Student } from '../students/studentTypes';
import { useAuth } from '../../auth/AuthProvider';
import formStyles from '../../components/forms/forms.module.css';

export interface MeetingLinkFormProps {
  studentId?: string;
  onSubmit: (input: MeetingLinkInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const MeetingLinkForm: React.FC<MeetingLinkFormProps> = ({
  studentId: initialStudentId,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { token } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId || '');
  const [students, setStudents] = useState<Student[]>([]);
  const [provider, setProvider] = useState('GOOGLE_MEET');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [label, setLabel] = useState('Standard Class Link');
  const [isPreferred, setIsPreferred] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialStudentId) {
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
    if (!meetingUrl.trim() || !isValidHttpsUrl(meetingUrl)) {
      setError('A valid HTTPS meeting URL is required (e.g. https://meet.google.com/...)');
      return;
    }
    await onSubmit({
      student_id: selectedStudentId || initialStudentId || undefined,
      provider,
      meeting_url: meetingUrl.trim(),
      label: label.trim() || undefined,
      is_preferred: isPreferred,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {!initialStudentId && (
        <FormField label="Assign to Student" required>
          <select
            className={formStyles.select}
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            {students.map((s) => (
              <option key={s.student_id} value={s.student_id}>
                {s.student_name || s.full_name || s.student_id} ({s.subject || 'General'})
              </option>
            ))}
          </select>
        </FormField>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Meeting Provider" required>
          <select
            className={formStyles.select}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="GOOGLE_MEET">Google Meet</option>
            <option value="ZOOM">Zoom</option>
            <option value="MS_TEAMS">MS Teams</option>
            <option value="OTHER">Other Provider</option>
          </select>
        </FormField>
        <FormField label="Label / Purpose">
          <input
            className={formStyles.input}
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Physics Recurring Link"
          />
        </FormField>
      </div>

      <FormField label="Meeting URL (HTTPS)" required error={error}>
        <input
          className={formStyles.input}
          type="url"
          value={meetingUrl}
          onChange={(e) => { setMeetingUrl(e.target.value); setError(null); }}
          placeholder="https://meet.google.com/abc-defg-hij"
        />
      </FormField>

      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', cursor: 'pointer', marginTop: 'var(--space-1)' }}>
        <input
          type="checkbox"
          checked={isPreferred}
          onChange={(e) => setIsPreferred(e.target.checked)}
        />
        <span>Set as Primary / Default Link for this student</span>
      </label>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" isLoading={isLoading}>
          Save Meeting Link
        </Button>
      </div>
    </form>
  );
};
