import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchHealthInfo } from './settingsApi';
import { SystemHealthInfo } from './settingsTypes';
import { getRuntimeConfig } from '../../config/runtimeConfig';
import { LoadingState } from '../../components/feedback/LoadingState';

export const SettingsPage: React.FC = () => {
  usePageTitle('Settings & System Health');
  const { user, token } = useAuth();
  const [health, setHealth] = useState<SystemHealthInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const config = getRuntimeConfig();

  useEffect(() => {
    fetchHealthInfo(token)
      .then((data) => setHealth(data))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingState message="Checking system diagnostics…" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '640px' }}>
      <div style={{ backgroundColor: 'var(--color-bg-surface)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)' }}>
        <h3 style={{ margin: '0 0 var(--space-4)' }}>Administrator Identity</h3>
        <p style={{ margin: '0 0 var(--space-2)' }}>Email: <strong>{user?.email}</strong></p>
        <p style={{ margin: 0 }}>Authorization: <strong>Authorized Primary Administrator</strong></p>
      </div>

      <div style={{ backgroundColor: 'var(--color-bg-surface)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)' }}>
        <h3 style={{ margin: '0 0 var(--space-4)' }}>Backend & Spreadsheet Service</h3>
        <p style={{ margin: '0 0 var(--space-2)' }}>
          Connection Status:{' '}
          <span style={{ fontWeight: 600, color: health?.appsScriptConnected ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
            {health?.appsScriptConnected ? '● Online (Connected)' : '○ Standby / Local Mock'}
          </span>
        </p>
        <p style={{ margin: '0 0 var(--space-2)' }}>Environment: <strong>{config.appEnv}</strong></p>
        <p style={{ margin: '0 0 var(--space-2)' }}>Apps Script URL: <code>{config.appsScriptUrl ? `${config.appsScriptUrl.substring(0, 32)}…` : 'Not Configured (Mock mode)'}</code></p>
        <p style={{ margin: 0 }}>Schema Version: <strong>v{health?.schemaVersion || 1}</strong> (12 Canonical Tabs)</p>
      </div>
    </div>
  );
};
