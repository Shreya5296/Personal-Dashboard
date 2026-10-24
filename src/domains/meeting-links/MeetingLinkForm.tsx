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
  targetSlot?: 'primary' | 'secondary' | null;
  onSubmit: (input: MeetingLinkInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const MeetingLinkForm: React.FC<MeetingLinkFormProps> = ({
  studentId: initialStudentId,
  initialLink,
  targetSlot,
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
    const pTrim = primaryUrl.trim();
    const sTrim = secondaryUrl.trim();

    if (!pTrim && !sTrim) {
      setError('At least one meeting link (Primary or Secondary) is required.');
      return;
    }

    if (pTrim && !isValidHttpsUrl(pTrim)) {
      setError('Primary Meeting Link must be a valid HTTPS URL (e.g. https://meet.google.com/...)');
      return;
    }

    if (sTrim && !isValidHttpsUrl(sTrim)) {
      setError('Secondary Meeting Link must be a valid HTTPS URL if provided.');
      return;
    }

    const provider = pTrim.includes('zoom.us') ? 'ZOOM' : 'GOOGLE_MEET';

    try {
      await onSubmit({
        student_id: selectedStudentId || initialStudentId || undefined,
        provider,
        meeting_url: pTrim || sTrim,
        meeting_link_1: pTrim,
        meeting_link_2: sTrim,
        link_label: 'Class Meeting Link',
        is_preferred: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save meeting link. Please try again.');
    }
  };

  const slotHeading = targetSlot === 'primary'
    ? 'Add Primary Meeting Link'
    : targetSlot === 'secondary'
    ? 'Add Secondary Meeting Link'
    : initialLink
    ? 'Edit Meeting Links'
    : 'Register Student Meeting Link';

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-2)' }}>
        <h4 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{slotHeading}</h4>
        {initialLink && (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', fontWeight: 600 }}>
            {initialLink.student_name || initialLink.student_id}
          </span>
        )}
      </div>

      {!initialStudentId && !initialLink && (
        <FormField label="Assign to Student" required>
          <select className={formStyles.select} value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
            {students.map((s) => (
              <option key={s.student_id} value={s.student_id}>
                {s.student_name || s.student_id} ({s.subject || 'General'})
              </option>
            ))}
          </select>
        </FormField>
      )}

      {(!targetSlot || targetSlot === 'primary') && (
        <FormField label="Primary Meeting Link (HTTPS)" required={targetSlot === 'primary'} error={error && !secondaryUrl ? error : undefined}>
          <input className={formStyles.input} type="url" value={primaryUrl} onChange={(e) => { setPrimaryUrl(e.target.value); setError(null); }} placeholder="https://meet.google.com/abc-defg-hij" autoFocus={targetSlot === 'primary'} />
        </FormField>
      )}

      {(!targetSlot || targetSlot === 'secondary') && (
        <FormField label="Secondary Meeting Link (HTTPS)" required={targetSlot === 'secondary'} error={error && !primaryUrl ? error : undefined}>
          <input className={formStyles.input} type="url" value={secondaryUrl} onChange={(e) => { setSecondaryUrl(e.target.value); setError(null); }} placeholder="https://zoom.us/j/987654321" autoFocus={targetSlot === 'secondary'} />
        </FormField>
      )}

      {error && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)', fontWeight: 500 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button variant="primary" type="submit" isLoading={isLoading}>Save Meeting Link</Button>
      </div>
    </form>
  );
};
