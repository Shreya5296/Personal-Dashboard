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
  return (
    <div className={styles.formGroup}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && <span className={styles.requiredAsterisk}>*</span>}
      </label>
      {children}
      {helpText && !error && <span className={styles.helpText}>{helpText}</span>}
      <FormError message={error} />
    </div>
  );
};
