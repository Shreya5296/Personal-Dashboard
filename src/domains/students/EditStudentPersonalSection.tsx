import React from 'react';
import { StudentInput } from './studentTypes';
import { FormField } from '../../components/forms/FormField';
import formStyles from '../../components/forms/forms.module.css';

export interface EditStudentPersonalSectionProps {
  values: StudentInput;
  errors?: Record<string, string>;
  onChange: (field: keyof StudentInput, value: string) => void;
  disabled?: boolean;
}

export const EditStudentPersonalSection: React.FC<EditStudentPersonalSectionProps> = ({
  values,
  errors = {},
  onChange,
  disabled = false,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '6px' }}>
        <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)' }}>
          1. Student & Parent Information
        </h4>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Full Name" required error={errors.student_name || errors.full_name}>
          <input className={formStyles.input} type="text" value={values.student_name} onChange={(e) => onChange('student_name', e.target.value)} placeholder="Full student name" disabled={disabled} />
        </FormField>
        <FormField label="Subject" error={errors.subject}>
          <input className={formStyles.input} type="text" value={values.subject || ''} onChange={(e) => onChange('subject', e.target.value)} placeholder="e.g. AP Calculus, IB Physics" disabled={disabled} />
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Parent Name" required error={errors.parent_name}>
          <input className={formStyles.input} type="text" value={values.parent_name} onChange={(e) => onChange('parent_name', e.target.value)} placeholder="Parent or guardian name" disabled={disabled} />
        </FormField>
        <FormField label="Parent Phone" required error={errors.parent_phone || errors.phone}>
          <input className={formStyles.input} type="tel" value={values.parent_phone} onChange={(e) => onChange('parent_phone', e.target.value)} placeholder="+91 98765 43210" disabled={disabled} />
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Parent Email" error={errors.parent_email}>
          <input className={formStyles.input} type="email" value={values.parent_email || ''} onChange={(e) => onChange('parent_email', e.target.value)} placeholder="parent@example.com" disabled={disabled} />
        </FormField>
        <FormField label="Student Email (Inactive)" error={errors.student_email}>
          <input className={formStyles.input} type="email" value={values.student_email || ''} disabled={true} readOnly={true} placeholder="Field inactive" title="Student Email is inactive" />
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Student Phone (Inactive)" error={errors.student_phone}>
          <input className={formStyles.input} type="tel" value={values.student_phone || ''} disabled={true} readOnly={true} placeholder="Field inactive" title="Student Phone is inactive" />
        </FormField>
        <FormField label="Status" error={errors.status}>
          <select className={formStyles.select} value={values.status ? String(values.status).trim().toUpperCase() : 'ACTIVE'} onChange={(e) => onChange('status', e.target.value.toUpperCase())} disabled={disabled}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive / Archived</option>
          </select>
        </FormField>
      </div>

      <FormField label="Administrative Notes (Inactive)" error={errors.notes}>
        <textarea className={formStyles.textarea} value={values.notes || ''} disabled={true} readOnly={true} rows={2} placeholder="Field inactive" title="Administrative Notes on student details is inactive" />
      </FormField>
    </div>
  );
};
