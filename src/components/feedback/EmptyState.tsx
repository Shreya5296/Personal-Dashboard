import React from 'react';
import styles from './feedback.module.css';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'There are no items to display at this time.',
  action,
}) => {
  return (
    <div className={styles.centerContainer}>
      <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-main)' }}>
        {title}
      </h3>
      <p style={{ marginTop: 'var(--space-1)', marginBottom: action ? 'var(--space-4)' : 0 }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
