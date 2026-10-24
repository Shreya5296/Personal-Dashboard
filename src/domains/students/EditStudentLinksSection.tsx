import React from 'react';
import { FormField } from '../../components/forms/FormField';
import { MeetingLinkButton } from '../meeting-links/MeetingLinkButton';
import formStyles from '../../components/forms/forms.module.css';

export interface EditStudentLinksSectionProps {
  meetingLink1: string;
  meetingLink2: string;
  errors?: Record<string, string>;
  onChange: (field: 'meeting_link_1' | 'meeting_link_2', value: string) => void;
  disabled?: boolean;
}

export const EditStudentLinksSection: React.FC<EditStudentLinksSectionProps> = ({
  meetingLink1,
  meetingLink2,
  errors = {},
  onChange,
  disabled = false,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '6px' }}>
        <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)' }}>
          2. Meeting Links
        </h4>
        <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
          Configure primary and secondary class video links. Platform buttons reflect Google Meet (green) and Zoom (blue).
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-3)' }}>
        <div>
          <FormField label="Primary Meeting Link" error={errors.meeting_link_1}>
            <input
              className={formStyles.input}
              type="url"
              value={meetingLink1}
              onChange={(e) => onChange('meeting_link_1', e.target.value)}
              placeholder="https://meet.google.com/abc-xyz-pqr"
              disabled={disabled}
            />
          </FormField>
          {meetingLink1.trim() && (
            <div style={{ marginTop: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginRight: '6px' }}>Preview:</span>
              <MeetingLinkButton url={meetingLink1.trim()} />
            </div>
          )}
        </div>

        <div>
          <FormField label="Secondary Meeting Link (Optional)" error={errors.meeting_link_2}>
            <input
              className={formStyles.input}
              type="url"
              value={meetingLink2}
              onChange={(e) => onChange('meeting_link_2', e.target.value)}
              placeholder="https://zoom.us/j/123456789"
              disabled={disabled}
            />
          </FormField>
          {meetingLink2.trim() && (
            <div style={{ marginTop: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginRight: '6px' }}>Preview:</span>
              <MeetingLinkButton url={meetingLink2.trim()} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};