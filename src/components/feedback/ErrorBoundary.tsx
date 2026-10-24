import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '../buttons/Button';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unhandled application error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={containerStyle}>
          <div style={cardStyle}>
            <div style={iconStyle}>⚠️</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 var(--space-2)' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: '0 0 var(--space-4)' }}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <Button variant="primary" onClick={this.handleReset}>
              Reload Application
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  padding: 'var(--space-6)',
  backgroundColor: 'var(--color-bg-base)',
};

const cardStyle: React.CSSProperties = {
  maxWidth: '440px',
  width: '100%',
  backgroundColor: 'var(--color-bg-surface)',
  borderRadius: 'var(--radius-xl)',
  border: '1px solid var(--color-border-subtle)',
  boxShadow: 'var(--shadow-md)',
  padding: '2rem',
  textAlign: 'center',
};

const iconStyle: React.CSSProperties = {
  fontSize: '2rem',
  marginBottom: 'var(--space-2)',
};
