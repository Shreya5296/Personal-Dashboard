import React from 'react';
import styles from './feedback.module.css';

export interface InlineNoticeProps {
  type?: 'info' | 'success' | 'warning' | 'danger';
  message: string;
  onDismiss?: () => void;
}

export const InlineNotice: React.FC<InlineNoticeProps> = ({
  type = 'info',
  message,
  onDismiss,
}) => {
  const toneClass =
    type === 'success'
      ? styles.noticeSuccess
      : type === 'warning'
      ? styles.noticeWarning
      : type === 'danger'
      ? styles.noticeDanger
      : styles.noticeInfo;

  return (
    <div className={`${styles.inlineNotice} ${toneClass}`} role="alert">
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          aria-label="Dismiss notice"
        >
          ✕
        </button>
      )}
    </div>
  );
};
