import React, { useState, useEffect } from 'react';
import { MeetingLinkInput, MeetingLink } from './meetingLinkTypes';
import { FormField } from '../../components/forms/FormField';
import { Button } from '../../components/buttons/Button';
import { isValidHttpsUrl } from '../../lib/urlSafety';
import { fetchStudents } from '../students/studentApi';
import { Student } from '../students/studentTypes';
import { useAuth } from '../../auth/AuthProvider';
import formStyles from '../../components/forms/forms.module.css';

export interface MeetingLinkFormProps {
  studentId?: string;
  initialLink?: MeetingLink | null;
  onSubmit: (input: MeetingLinkInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const MeetingLinkForm: React.FC<MeetingLinkFormProps> = ({
  studentId: initialStudentId,
  initialLink,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { token } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState(
    initialLink?.student_id || initialStudentId || ''
  );
  const [students, setStudents] = useState<Student[]>([]);
  const [primaryUrl, setPrimaryUrl] = useState(
    initialLink?.meeting_link_1 || initialLink?.meeting_url || ''
  );
  const [secondaryUrl, setSecondaryUrl] = useState(
    initialLink?.meeting_link_2 || ''
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialStudentId && !initialLink?.student_id) {
      fetchStudents({}, token).then((data) => {
        setStudents(data);
        if (data.length > 0 && !selectedStudentId) {
          setSelectedStudentId(data[0].student_id);
        }
      });
    }
  }, [initialStudentId, initialLink, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryUrl.trim() || !isValidHttpsUrl(primaryUrl)) {
      setError('A valid HTTPS Primary Meeting Link is required (e.g. https://meet.google.com/...)');
      return;
    }
    if (secondaryUrl.trim() && !isValidHttpsUrl(secondaryUrl)) {
      setError('Secondary Meeting Link must be a valid HTTPS URL if provided.');
      return;
    }

    const pUrl = primaryUrl.trim();
    const sUrl = secondaryUrl.trim();
    const provider = pUrl.includes('zoom') ? 'ZOOM' : 'GOOGLE_MEET';

    await onSubmit({
      student_id: selectedStudentId || initialStudentId || undefined,
      provider,
      meeting_url: pUrl,
      meeting_link_1: pUrl,
      meeting_link_2: sUrl || undefined,
      link_label: 'Primary Link',
      is_preferred: true,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {!initialStudentId && !initialLink && (
        <FormField label="Assign to Student" required>
          <select
            className={formStyles.select}
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            {students.map((s) => (
              <option key={s.student_id} value={s.student_id}>
                {s.student_name || s.student_id} ({s.subject || 'General'})
              </option>
            ))}
          </select>
        </FormField>
      )}

      <FormField label="Primary meeting link (HTTPS)" required error={error}>
        <input
          className={formStyles.input}
          type="url"
          value={primaryUrl}
          onChange={(e) => { setPrimaryUrl(e.target.value); setError(null); }}
          placeholder="https://meet.google.com/abc-defg-hij"
        />
      </FormField>

      <FormField label="Secondary meeting link (Optional)">
        <input
          className={formStyles.input}
          type="url"
          value={secondaryUrl}
          onChange={(e) => { setSecondaryUrl(e.target.value); setError(null); }}
          placeholder="https://zoom.us/j/987654321 or backup link"
        />
      </FormField>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" isLoading={isLoading}>
          Save Link
        </Button>
      </div>
    </form>
  );
};
