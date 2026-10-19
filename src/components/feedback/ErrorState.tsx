import React from 'react';
import styles from './feedback.module.css';
import { Button } from '../buttons/Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'An error occurred',
  message = 'Failed to load data. Please check your connection and try again.',
  onRetry,
}) => {
  return (
    <div className={styles.centerContainer} role="alert">
      <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-danger)' }}>
        {title}
      </h3>
      <p style={{ marginTop: 'var(--space-1)', marginBottom: onRetry ? 'var(--space-4)' : 0 }}>
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
};
