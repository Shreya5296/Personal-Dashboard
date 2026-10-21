import React, { useState } from 'react';
import { Student, StudentInput } from './studentTypes';
import { validateStudentInput, mapApiErrorsToFields } from './studentValidation';
import { FormField } from '../../components/forms/FormField';
import { Button } from '../../components/buttons/Button';
import { ApiClientError } from '../../api/apiErrors';

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
    const validation = validateStudentInput(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    try {
      await onSubmit(formData);
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.details) setErrors(mapApiErrorsToFields(err.details));
      setServerError((err as Error).message || 'Failed to save student');
    }
  };

  const inputStyle = { width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' };

  return (
    <form noValidate onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {serverError && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: 'var(--radius-md)', color: '#b91c1c', fontSize: '0.875rem' }}>
          {serverError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <FormField label="Student Name" required error={errors.student_name || errors.full_name}>
          <input type="text" value={formData.student_name} onChange={(e) => handleChange('student_name', e.target.value)} placeholder="Student name" style={inputStyle} />
        </FormField>
        <FormField label="Subject" error={errors.subject}>
          <input type="text" value={formData.subject || ''} onChange={(e) => handleChange('subject', e.target.value)} placeholder="e.g. Mathematics, Physics" style={inputStyle} />
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <FormField label="Parent Name" required error={errors.parent_name}>
          <input type="text" value={formData.parent_name} onChange={(e) => handleChange('parent_name', e.target.value)} placeholder="Parent name" style={inputStyle} />
        </FormField>
        <FormField label="Parent Phone" required error={errors.parent_phone || errors.phone}>
          <input type="tel" value={formData.parent_phone} onChange={(e) => handleChange('parent_phone', e.target.value)} placeholder="Parent phone" style={inputStyle} />
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <FormField label="Parent Email" error={errors.parent_email}>
          <input type="email" value={formData.parent_email || ''} onChange={(e) => handleChange('parent_email', e.target.value)} placeholder="parent@example.com" style={inputStyle} />
        </FormField>
        <FormField label="Student Email" error={errors.student_email}>
          <input type="email" value={formData.student_email || ''} onChange={(e) => handleChange('student_email', e.target.value)} placeholder="student@example.com" style={inputStyle} />
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <FormField label="Student Phone" error={errors.student_phone}>
          <input type="tel" value={formData.student_phone || ''} onChange={(e) => handleChange('student_phone', e.target.value)} placeholder="Student phone (optional)" style={inputStyle} />
        </FormField>
        <FormField label="Status" error={errors.status}>
          <select value={formData.status || 'ACTIVE'} onChange={(e) => handleChange('status', e.target.value)} style={inputStyle}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </FormField>
      </div>

      <FormField label="Notes" error={errors.notes}>
        <textarea value={formData.notes || ''} onChange={(e) => handleChange('notes', e.target.value)} rows={2} placeholder="Notes about student..." style={{ ...inputStyle, resize: 'vertical' }} />
      </FormField>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button variant="primary" type="submit" isLoading={isLoading}>{initialStudent ? 'Save Changes' : 'Create Student'}</Button>
      </div>
    </form>
  );
};
