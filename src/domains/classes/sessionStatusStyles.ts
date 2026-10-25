import React from 'react';

export type SessionCategory = 'COMPLETED' | 'UPCOMING' | 'ALERT';

export interface SessionStatusStyleConfig {
  category: SessionCategory;
  label: string;
  bg: string;
  color: string;
  border: string;
  rowBg: string;
  badgeStyle: React.CSSProperties;
}

export function classifySessionStatus(sessionStatus?: string, attendanceStatus?: string): { category: SessionCategory; label: string } {
  const s = (sessionStatus || '').trim().toUpperCase();
  const a = (attendanceStatus || '').trim().toUpperCase();

  if (s === 'CANCELLED' || a === 'CANCELLED') {
    return { category: 'ALERT', label: 'Cancelled' };
  }
  if (s === 'NO_SHOW' || a === 'NO_SHOW') {
    return { category: 'ALERT', label: 'No Show' };
  }
  if (s === 'MISSED' || a === 'MISSED' || a === 'ABSENT' || a === 'ABSENT_UNEXCUSED') {
    return { category: 'ALERT', label: 'Missed' };
  }
  if (s === 'COMPLETED' || a === 'ATTENDED' || a === 'PRESENT') {
    return { category: 'COMPLETED', label: 'Completed' };
  }
  return { category: 'UPCOMING', label: 'Upcoming' };
}

export function getSessionStatusStyle(sessionStatus?: string, attendanceStatus?: string): SessionStatusStyleConfig {
  const { category, label } = classifySessionStatus(sessionStatus, attendanceStatus);

  if (category === 'COMPLETED') {
    return {
      category,
      label,
      bg: 'var(--color-success-bg)',
      color: 'var(--color-success-text)',
      border: 'var(--color-success-border)',
      rowBg: 'rgba(5, 150, 105, 0.03)',
      badgeStyle: {
        fontSize: 'var(--font-size-xs)',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'var(--color-success-bg)',
        color: 'var(--color-success-text)',
        border: '1px solid var(--color-success-border)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      },
    };
  }

  if (category === 'ALERT') {
    return {
      category,
      label,
      bg: 'var(--color-danger-bg)',
      color: 'var(--color-danger-text)',
      border: 'var(--color-danger-border)',
      rowBg: 'rgba(220, 38, 38, 0.04)',
      badgeStyle: {
        fontSize: 'var(--font-size-xs)',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'var(--color-danger-bg)',
        color: 'var(--color-danger-text)',
        border: '1px solid var(--color-danger-border)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      },
    };
  }

  return {
    category,
    label,
    bg: 'var(--color-warning-bg)',
    color: 'var(--color-warning-text)',
    border: 'var(--color-warning-border)',
    rowBg: 'transparent',
    badgeStyle: {
      fontSize: 'var(--font-size-xs)',
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      backgroundColor: 'var(--color-warning-bg)',
      color: 'var(--color-warning-text)',
      border: '1px solid var(--color-warning-border)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
    },
  };
}
