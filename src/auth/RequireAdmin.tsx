import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { getRuntimeConfig } from '../config/runtimeConfig';
import { sendApiRequest } from '../api/apiClient';
import { AuthUser } from './authState';
import { Button } from '../components/buttons/Button';
import formStyles from '../components/forms/forms.module.css';

export const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, user, signInWithToken } = useAuth();
  const config = getRuntimeConfig();
  const [accessKey, setAccessKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'var(--font-sans)', color: 'var(--color-text-muted)' }}>
        <p>Loading application session…</p>
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
        if (config.useMockData || (!config.appsScriptUrl && config.enableMockAuth)) {
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
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 'var(--space-6)', backgroundColor: 'var(--color-bg-base)' }}>
        <div style={{ maxWidth: '400px', width: '100%', backgroundColor: 'var(--color-bg-surface)', padding: '2rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--color-border-subtle)', textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 var(--space-1)', color: 'var(--color-text-main)', letterSpacing: '-0.01em' }}>Personal Dashboard</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 0 var(--space-5)', fontSize: 'var(--font-size-sm)' }}>
            Enter your administrator access key to authenticate.
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <input
              type="password"
              placeholder="Administrator Access Key"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              className={formStyles.input}
            />

            {loginError && (
              <div style={{ color: 'var(--color-danger-text)', backgroundColor: 'var(--color-danger-bg)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)', textAlign: 'left', border: '1px solid var(--color-danger-border)' }}>
                {loginError}
              </div>
            )}

            <Button type="submit" disabled={isSubmitting || !accessKey.trim()} isLoading={isSubmitting} style={{ width: '100%' }}>
              Sign In as Administrator
            </Button>
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
