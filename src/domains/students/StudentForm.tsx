import React, { useState } from 'react';
import { Student, StudentInput } from './studentTypes';
import { validateStudentInput, mapApiErrorsToFields } from './studentValidation';
import { FormField } from '../../components/forms/FormField';
import { Button } from '../../components/buttons/Button';
import { ApiClientError } from '../../api/apiErrors';
import formStyles from '../../components/forms/forms.module.css';

export interface StudentFormProps {
  initialStudent?: Student | null;
  onSubmit: (input: StudentInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const StudentForm: React.FC<StudentFormProps> = ({
  initialStudent,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<StudentInput>({
    student_name: initialStudent?.student_name || initialStudent?.full_name || '',
    subject: initialStudent?.subject || '',
    parent_name: initialStudent?.parent_name || '',
    parent_phone: initialStudent?.parent_phone || initialStudent?.phone || '',
    parent_email: initialStudent?.parent_email || '',
    student_phone: initialStudent?.student_phone || '',
    student_email: initialStudent?.student_email || initialStudent?.email || '',
    status: initialStudent?.status || 'ACTIVE',
    notes: initialStudent?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const handleChange = (field: keyof StudentInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field] || errors[field === 'student_name' ? 'full_name' : '']) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        delete next.full_name;
        return next;
      });
    }
    if (serverError) setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const submissionData: StudentInput = {
      ...formData,
      student_phone: initialStudent?.student_phone || '',
      student_email: initialStudent?.student_email || initialStudent?.email || '',
      notes: initialStudent?.notes || '',
    };
    const validation = validateStudentInput(submissionData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    try {
      await onSubmit(submissionData);
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.details) setErrors(mapApiErrorsToFields(err.details));
      setServerError((err as Error).message || 'Failed to save student');
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {serverError && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-text)', fontSize: 'var(--font-size-sm)' }}>
          {serverError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Full Name" required error={errors.student_name || errors.full_name}>
          <input className={formStyles.input} type="text" value={formData.student_name} onChange={(e) => handleChange('student_name', e.target.value)} placeholder="Full student name" />
        </FormField>
        <FormField label="Subject" error={errors.subject}>
          <input className={formStyles.input} type="text" value={formData.subject || ''} onChange={(e) => handleChange('subject', e.target.value)} placeholder="e.g. AP Calculus, IB Physics" />
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Parent Name" required error={errors.parent_name}>
          <input className={formStyles.input} type="text" value={formData.parent_name} onChange={(e) => handleChange('parent_name', e.target.value)} placeholder="Parent or guardian name" />
        </FormField>
        <FormField label="Parent Phone" required error={errors.parent_phone || errors.phone}>
          <input className={formStyles.input} type="tel" value={formData.parent_phone} onChange={(e) => handleChange('parent_phone', e.target.value)} placeholder="+91 98765 43210" />
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Parent Email" error={errors.parent_email}>
          <input className={formStyles.input} type="email" value={formData.parent_email || ''} onChange={(e) => handleChange('parent_email', e.target.value)} placeholder="parent@example.com" />
        </FormField>
        <FormField label="Student Email (Inactive)" error={errors.student_email}>
          <input className={formStyles.input} type="email" value={formData.student_email || ''} disabled={true} readOnly={true} placeholder="Field inactive" title="Student Email is inactive" />
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Student Phone (Inactive)" error={errors.student_phone}>
          <input className={formStyles.input} type="tel" value={formData.student_phone || ''} disabled={true} readOnly={true} placeholder="Field inactive" title="Student Phone is inactive" />
        </FormField>
        <FormField label="Status" error={errors.status}>
          <select className={formStyles.select} value={formData.status || 'ACTIVE'} onChange={(e) => handleChange('status', e.target.value)}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive / Archived</option>
          </select>
        </FormField>
      </div>

      <FormField label="Administrative Notes (Inactive)" error={errors.notes}>
        <textarea className={formStyles.textarea} value={formData.notes || ''} disabled={true} readOnly={true} rows={2} placeholder="Field inactive" title="Administrative Notes is inactive" />
      </FormField>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button variant="primary" type="submit" isLoading={isLoading}>{initialStudent ? 'Save Changes' : 'Create Student'}</Button>
      </div>
    </form>
  );
};
