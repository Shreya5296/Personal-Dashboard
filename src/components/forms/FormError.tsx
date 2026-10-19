import React from 'react';
import styles from './forms.module.css';

export interface FormErrorProps {
  message?: string | null;
}

export const FormError: React.FC<FormErrorProps> = ({ message }) => {
  if (!message) return null;
  return (
    <div className={styles.errorText} role="alert">
      {message}
    </div>
  );
};
