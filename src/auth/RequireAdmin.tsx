import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { getRuntimeConfig } from '../config/runtimeConfig';
import { sendApiRequest } from '../api/apiClient';
import { AuthUser } from './authState';

export const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, user, signInWithToken } = useAuth();
  const config = getRuntimeConfig();
  const [accessKey, setAccessKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'var(--font-sans)' }}>
        <p>Loading application session...</p>
      </div>
    );
  }

  if (status === 'unauthenticated' || !user) {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!accessKey.trim()) return;

      setIsSubmitting(true);
      setLoginError(null);

      try {
        if (!config.appsScriptUrl && config.enableMockAuth) {
          signInWithToken('mock_admin_token', {
            email: 'ashreya0502@gmail.com',
            name: 'Authorized Administrator',
            isAdmin: true,
          });
          return;
        }

        const res = await sendApiRequest<{ token: string; user: AuthUser }>('auth.login', {
          key: accessKey.trim(),
        });

        if (res.ok && res.data) {
          signInWithToken(res.data.token, res.data.user);
        } else {
          setLoginError(res.error?.message || 'Invalid administrator access key');
        }
      } catch (err: unknown) {
        setLoginError((err as Error)?.message || 'Authentication request failed');
      } finally {
        setIsSubmitting(false);
      }
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
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-2)' }}>Personal Dashboard</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)', fontSize: 'var(--font-size-sm)' }}>
            Enter your administrator access key to authenticate.
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <input
              type="password"
              placeholder="Administrator Access Key"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                boxSizing: 'border-box',
              }}
            />

            {loginError && (
              <div style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)', textAlign: 'left' }}>
                ⚠️ {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !accessKey.trim()}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: isSubmitting || !accessKey.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: 'var(--font-size-sm)',
                opacity: isSubmitting || !accessKey.trim() ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In as Administrator'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>Your identity ({user.email}) is not on the administrator allowlist.</p>
      </div>
    );
  }

  return <>{children}</>;
};
