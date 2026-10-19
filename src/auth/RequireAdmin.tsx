import React from 'react';
import { useAuth } from './AuthProvider';
import { getRuntimeConfig } from '../config/runtimeConfig';

export const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, user, signInWithToken } = useAuth();
  const config = getRuntimeConfig();

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'var(--font-sans)' }}>
        <p>Loading application session...</p>
      </div>
    );
  }

  if (status === 'unauthenticated' || !user) {
    const handleDevLogin = () => {
      signInWithToken('mock_admin_token', {
        email: 'admin@example.com',
        name: 'Authorized Administrator',
        isAdmin: true,
      });
    };

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: 'var(--space-6)',
        backgroundColor: 'var(--color-bg-subtle)',
      }}>
        <div style={{
          maxWidth: '420px',
          width: '100%',
          backgroundColor: 'var(--color-bg-surface)',
          padding: 'var(--space-8)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-2)' }}>Student Management</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
            Sign in with an authorized Google account to access administrator controls.
          </p>

          <div id="google-signin-target" style={{ minHeight: '44px', display: 'flex', justifyContent: 'center' }}>
            {config.enableMockAuth && (
              <button
                type="button"
                onClick={handleDevLogin}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                Sign In as Administrator (Demo / Dev)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>Your Google account ({user.email}) is not on the administrator allowlist.</p>
      </div>
    );
  }

  return <>{children}</>;
};
