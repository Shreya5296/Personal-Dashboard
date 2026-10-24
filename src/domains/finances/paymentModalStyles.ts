import React from 'react';

export const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.55)',
  backdropFilter: 'blur(2px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  padding: 'var(--space-4)',
};

export const dialogStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-bg-surface)',
  borderRadius: 'var(--radius-xl)',
  maxWidth: '520px',
  width: '100%',
  padding: '1.25rem',
  boxShadow: 'var(--shadow-lg)',
  border: '1px solid var(--color-border-subtle)',
};

export const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid var(--color-border-subtle)',
  paddingBottom: 'var(--space-2)',
  marginBottom: 'var(--space-3)',
};

export const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '1.1rem',
  cursor: 'pointer',
  color: 'var(--color-text-muted)',
};

export const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 600,
  marginBottom: '4px',
  color: 'var(--color-text-main)',
};

export const errorStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  color: 'var(--color-danger)',
  marginTop: '4px',
  fontWeight: 500,
};

export const serverErrorStyle: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: 'var(--color-danger-bg)',
  color: 'var(--color-danger-text)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--font-size-xs)',
  marginBottom: 'var(--space-3)',
};

export const actionRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--space-3)',
  borderTop: '1px solid var(--color-border-subtle)',
  paddingTop: 'var(--space-3)',
  marginTop: 'var(--space-2)',
};
