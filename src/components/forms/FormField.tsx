import React from 'react';
import styles from './forms.module.css';
import { FormError } from './FormError';

export interface FormFieldProps {
  id?: string;
  label: string;
  required?: boolean;
  error?: string | null;
  helpText?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  required = false,
  error,
  helpText,
  children,
}) => {
  const fieldId = id || `field_${label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  const renderedChild = React.isValidElement(children) && !(children.props as { id?: string }).id
    ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id: fieldId })
    : children;

  return (
    <div className={styles.formGroup}>
      <label htmlFor={fieldId} className={styles.label}>
        {label}
        {required && <span className={styles.requiredAsterisk}>*</span>}
      </label>
      {renderedChild}
      {helpText && !error && <span className={styles.helpText}>{helpText}</span>}
      <FormError message={error} />
    </div>
  );
};
