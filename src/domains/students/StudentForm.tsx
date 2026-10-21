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
    full_name: initialStudent?.full_name || '',
    subject: initialStudent?.subject || '',
    email: initialStudent?.email || '',
    phone: initialStudent?.phone || '',
    parent_name: initialStudent?.parent_name || '',
    parent_email: initialStudent?.parent_email || '',
    parent_phone: initialStudent?.parent_phone || '',
    notes: initialStudent?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const handleChange = (field: keyof StudentInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
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
        <FormField label="Full Name" required error={errors.full_name}>
          <input type="text" value={formData.full_name} onChange={(e) => handleChange('full_name', e.target.value)} placeholder="Student full name" style={inputStyle} />
        </FormField>
        <FormField label="Subject" error={errors.subject}>
          <input type="text" value={formData.subject || ''} onChange={(e) => handleChange('subject', e.target.value)} placeholder="e.g. Mathematics, Physics" style={inputStyle} />
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <FormField label="Student Email" error={errors.email}>
          <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="student@example.com" style={inputStyle} />
        </FormField>
        <FormField label="Student Phone" error={errors.phone}>
          <input type="tel" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+91 98765 43210" style={inputStyle} />
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <FormField label="Parent Name" error={errors.parent_name}>
          <input type="text" value={formData.parent_name} onChange={(e) => handleChange('parent_name', e.target.value)} placeholder="Parent name" style={inputStyle} />
        </FormField>
        <FormField label="Parent Phone" error={errors.parent_phone}>
          <input type="tel" value={formData.parent_phone} onChange={(e) => handleChange('parent_phone', e.target.value)} placeholder="Parent phone" style={inputStyle} />
        </FormField>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button variant="primary" type="submit" isLoading={isLoading}>{initialStudent ? 'Save Changes' : 'Create Student'}</Button>
      </div>
    </form>
  );
};
