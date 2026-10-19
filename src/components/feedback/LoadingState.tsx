import React from 'react';
import styles from './feedback.module.css';

export interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading…' }) => {
  return (
    <div className={styles.centerContainer} role="status">
      <div className={styles.spinner} />
      <p>{message}</p>
    </div>
  );
};
