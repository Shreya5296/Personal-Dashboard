import React from 'react';
import { StudentDetails } from './registrationTypes';
import { FormField } from '../../components/forms/FormField';
import formStyles from '../../components/forms/forms.module.css';

export interface StudentDetailsSectionProps {
  values: StudentDetails;
  errors?: Partial<Record<keyof StudentDetails, string>>;
  onChange: (field: keyof StudentDetails, value: string) => void;
  disabled?: boolean;
}

export const StudentDetailsSection: React.FC<StudentDetailsSectionProps> = ({
  values,
  errors,
  onChange,
  disabled = false,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '6px' }}>
        1. Student Details
      </h4>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Student Name" required error={errors?.student_name}>
          <input
            type="text"
            className={`${formStyles.input} ${errors?.student_name ? formStyles.inputError : ''}`}
            placeholder="e.g. Rehaan Sharma"
            value={values.student_name}
            onChange={(e) => onChange('student_name', e.target.value)}
            disabled={disabled}
          />
        </FormField>
        <FormField label="Subjects" error={errors?.subject}>
          <input
            type="text"
            className={formStyles.input}
            placeholder="e.g. AP Calculus, IB Physics"
            value={values.subject}
            onChange={(e) => onChange('subject', e.target.value)}
            disabled={disabled}
          />
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Student Phone (Inactive)" error={errors?.student_phone}>
          <input
            type="tel"
            className={formStyles.input}
            placeholder="Field inactive"
            value={values.student_phone}
            disabled={true}
            readOnly={true}
            title="Student Phone is currently inactive"
          />
        </FormField>
        <FormField label="Student Email (Inactive)" error={errors?.student_email}>
          <input
            type="email"
            className={formStyles.input}
            placeholder="Field inactive"
            value={values.student_email}
            disabled={true}
            readOnly={true}
            title="Student Email is currently inactive"
          />
        </FormField>
      </div>
    </div>
  );
};
