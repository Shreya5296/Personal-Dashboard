import React, { useState } from 'react';
import { ClassSessionInput } from './classTypes';
import { FormField } from '../../components/forms/FormField';
import { Button } from '../../components/buttons/Button';
import { useAuth } from '../../auth/AuthProvider';
import { useClassScheduling } from './useClassScheduling';
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
  const {
    selectedStudentId,
    setSelectedStudentId,
    students,
    selectedStudent,
    classDate,
    setClassDate,
    startTime,
    setStartTime,
    timeSource,
    durationMinutes,
    hasPackageDuration,
    endTime,
  } = useClassScheduling(initialStudentId, token);

  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!selectedStudentId) { setFormError('Please select a student.'); return; }
    if (!classDate) { setFormError('Please select a class date.'); return; }
    if (!startTime) { setFormError('Please specify a class start time.'); return; }
    if (!endTime) {
      setFormError('Class cannot cross midnight. Please select an earlier start time.');
      return;
    }

    const [y, m, d] = classDate.split('-').map(Number);
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startDt = new Date(y, m - 1, d, sh, sm, 0);
    const endDt = new Date(y, m - 1, d, eh, em, 0);
    const sName = selectedStudent?.student_name || selectedStudent?.full_name || '';

    await onSubmit({
      student_id: selectedStudentId,
      student_name: sName,
      subject: selectedStudent?.subject,
      package_id: packageId || undefined,
      meeting_link_id: meetingLinkId || undefined,
      topic: sName ? `${sName} - Class Session` : 'Class Session',
      class_title: sName ? `${sName} - Class Session` : 'Class Session',
      start_time: startDt.toISOString(),
      scheduled_start: startDt.toISOString(),
      scheduled_end: endDt.toISOString(),
      duration_minutes: durationMinutes,
    });
  };

  const showStudentPicker = !initialStudentId || initialStudentId === 'stu_general';

  return (
    <form noValidate onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {formError && (
        <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-text)', fontSize: 'var(--font-size-xs)' }}>
          ⚠️ {formError}
        </div>
      )}

      {showStudentPicker && (
        <FormField label="Select Student" required>
          <select className={formStyles.select} value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
            {students.length === 0 && <option value="">No students available</option>}
            {students.map((s) => (
              <option key={s.student_id} value={s.student_id}>{s.student_name || s.full_name || s.student_id}</option>
            ))}
          </select>
        </FormField>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Class Date" required>
          <input className={formStyles.input} type="date" value={classDate} onChange={(e) => setClassDate(e.target.value)} />
        </FormField>

        <FormField label="Class Start Time" required>
          <input className={formStyles.input} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', display: 'block' }}>
            {timeSource === 'recurring' ? 'Derived from recurring schedule' : 'Set manually (no recurring schedule match)'}
          </span>
        </FormField>
      </div>

      <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)', fontSize: 'var(--font-size-xs)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>Class Duration: </span>
          <span style={{ color: 'var(--color-text-muted)' }}>{durationMinutes} min ({hasPackageDuration ? 'from student package' : 'standard default'})</span>
        </div>
        <div>
          <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>End Time: </span>
          <span style={{ color: endTime ? 'var(--color-text-muted)' : 'var(--color-danger)' }}>{endTime || 'Crosses midnight!'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button variant="primary" type="submit" isLoading={isLoading}>Schedule Class</Button>
      </div>
    </form>
  );
};
