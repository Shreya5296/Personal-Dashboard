import React from 'react';
import styles from './feedback.module.css';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'There are no items to display at this time.',
  action,
  icon,
}) => {
  return (
    <div className={styles.centerContainer}>
      <div className={styles.emptyIconCircle}>
        {icon || (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        )}
      </div>
      <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-main)', margin: '0 0 var(--space-1)' }}>
        {title}
      </h3>
      <p style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--font-size-sm)', maxWidth: '420px', lineHeight: 1.4 }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
