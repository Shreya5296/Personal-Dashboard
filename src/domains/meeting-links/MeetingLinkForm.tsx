import React, { useState } from 'react';
import { MeetingLinkInput } from './meetingLinkTypes';
import { FormField } from '../../components/forms/FormField';
import { Button } from '../../components/buttons/Button';
import { isValidHttpsUrl } from '../../lib/urlSafety';

export interface MeetingLinkFormProps {
  studentId?: string;
  onSubmit: (input: MeetingLinkInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const MeetingLinkForm: React.FC<MeetingLinkFormProps> = ({
  studentId,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [provider, setProvider] = useState('GOOGLE_MEET');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [label, setLabel] = useState('Standard Class Link');
  const [isPreferred, setIsPreferred] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingUrl.trim() || !isValidHttpsUrl(meetingUrl)) {
      setError('A valid HTTPS meeting URL is required.');
      return;
    }
    await onSubmit({
      student_id: studentId || undefined,
      provider,
      meeting_url: meetingUrl.trim(),
      label: label.trim() || undefined,
      is_preferred: isPreferred,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-3)' }}>
        <FormField label="Provider" required>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)', backgroundColor: 'var(--color-bg-surface)' }}
          >
            <option value="GOOGLE_MEET">Google Meet</option>
            <option value="ZOOM">Zoom</option>
            <option value="MS_TEAMS">MS Teams</option>
            <option value="OTHER">Other</option>
          </select>
        </FormField>
        <FormField label="Label / Purpose">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Physics Recurring Link"
            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' }}
          />
        </FormField>
      </div>

      <FormField label="Meeting URL (HTTPS)" required error={error}>
        <input
          type="url"
          value={meetingUrl}
          onChange={(e) => { setMeetingUrl(e.target.value); setError(null); }}
          placeholder="https://meet.google.com/abc-defg-hij"
          style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' }}
        />
      </FormField>

      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
        <input
          type="checkbox"
          checked={isPreferred}
          onChange={(e) => setIsPreferred(e.target.checked)}
        />
        Set as Preferred / Primary Link
      </label>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
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
