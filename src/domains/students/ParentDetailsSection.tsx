import React from 'react';
import { ParentDetails } from './registrationTypes';
import { FormField } from '../../components/forms/FormField';
import formStyles from '../../components/forms/forms.module.css';

export interface ParentDetailsSectionProps {
  values: ParentDetails;
  errors?: Partial<Record<keyof ParentDetails, string>>;
  onChange: (field: keyof ParentDetails, value: string) => void;
  disabled?: boolean;
}

export const ParentDetailsSection: React.FC<ParentDetailsSectionProps> = ({
  values,
  errors,
  onChange,
  disabled = false,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '6px' }}>
        2. Parent Details
      </h4>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Parent Name" required error={errors?.parent_name}>
          <input
            type="text"
            className={`${formStyles.input} ${errors?.parent_name ? formStyles.inputError : ''}`}
            placeholder="e.g. Rajiv Sharma"
            value={values.parent_name}
            onChange={(e) => onChange('parent_name', e.target.value)}
            disabled={disabled}
          />
        </FormField>
        <FormField label="Parent Phone" required error={errors?.parent_phone}>
          <input
            type="tel"
            className={`${formStyles.input} ${errors?.parent_phone ? formStyles.inputError : ''}`}
            placeholder="+91 98765 43210"
            value={values.parent_phone}
            onChange={(e) => onChange('parent_phone', e.target.value)}
            disabled={disabled}
          />
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Parent Email" error={errors?.parent_email}>
          <input
            type="email"
            className={`${formStyles.input} ${errors?.parent_email ? formStyles.inputError : ''}`}
            placeholder="parent@example.com (Optional)"
            value={values.parent_email}
            onChange={(e) => onChange('parent_email', e.target.value)}
            disabled={disabled}
          />
        </FormField>
      </div>
    </div>
  );
};
