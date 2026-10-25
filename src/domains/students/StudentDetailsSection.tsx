import React from 'react';
import { StudentDetails } from './registrationTypes';
import { FormField } from '../../components/forms/FormField';
import formStyles from '../../components/forms/forms.module.css';
import { SubjectMultiSelect, parseSubjectList } from './SubjectMultiSelect';

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
  const selectedSubjects = parseSubjectList(values.subject);

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
          <SubjectMultiSelect
            selectedSubjects={selectedSubjects}
            onChange={(subjs) => onChange('subject', subjs.join(', '))}
            disabled={disabled}
            error={errors?.subject}
          />
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Student Phone" error={errors?.student_phone}>
          <input
            type="tel"
            className={`${formStyles.input} ${errors?.student_phone ? formStyles.inputError : ''}`}
            placeholder="e.g. +91 98765 43211"
            value={values.student_phone || ''}
            onChange={(e) => onChange('student_phone', e.target.value)}
            disabled={disabled}
          />
        </FormField>
        <FormField label="Student Email" error={errors?.student_email}>
          <input
            type="email"
            className={`${formStyles.input} ${errors?.student_email ? formStyles.inputError : ''}`}
            placeholder="e.g. student@example.com"
            value={values.student_email || ''}
            onChange={(e) => onChange('student_email', e.target.value)}
            disabled={disabled}
          />
        </FormField>
      </div>
    </div>
  );
};
