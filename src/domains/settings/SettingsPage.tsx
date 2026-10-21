import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchHealthInfo } from './settingsApi';
import { SystemHealthInfo } from './settingsTypes';
import { getRuntimeConfig } from '../../config/runtimeConfig';
import { LoadingState } from '../../components/feedback/LoadingState';
import { PageHeader } from '../../layout/PageHeader';
import { Button } from '../../components/buttons/Button';
import { CopyIcon } from '../../components/icons/ActionIcons';

export const SettingsPage: React.FC = () => {
  usePageTitle('Settings & System Health');
  const { user, token } = useAuth();
  const [health, setHealth] = useState<SystemHealthInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const config = getRuntimeConfig();

  useEffect(() => {
    fetchHealthInfo(token)
      .then((data) => setHealth(data))
      .finally(() => setLoading(false));
  }, [token]);

  const handleCopyUrl = () => {
    if (!config.appsScriptUrl) return;
    navigator.clipboard.writeText(config.appsScriptUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <LoadingState message="Checking system diagnostics…" />;

  const isConnected = Boolean(health?.appsScriptConnected);
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-surface)',
    padding: '1.25rem 1.5rem',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--color-border-subtle)',
    boxShadow: 'var(--shadow-xs)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: '720px' }}>
      <PageHeader
        title="Settings & System Health"
        subtitle="Operational diagnostics, backend service health, and administrator access configuration."
      />

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Administrator Identity</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
          <div>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', display: 'block' }}>Admin Email</span>
            <strong>{user?.email || 'admin@personal-dashboard.local'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', display: 'block' }}>Authorization Status</span>
            <span style={{ color: '#059669', fontWeight: 600 }}>● Primary Authorized Admin</span>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Backend & Spreadsheet Service</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Connection Status</span>
            <span style={{ fontWeight: 600, color: isConnected ? '#059669' : 'var(--color-text-muted)' }}>
              {isConnected ? '● Online & Synchronized' : '○ Standby / Local Mock'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Runtime Environment</span>
            <strong>{config.useMockData ? 'Demo / Mock Data' : config.appEnv}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>API Endpoint</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <code>{config.appsScriptUrl ? `${config.appsScriptUrl.slice(0, 24)}…` : 'Not Configured'}</code>
              {config.appsScriptUrl && (
                <Button variant="ghost" size="sm" onClick={handleCopyUrl}>
                  <CopyIcon size={12} /> {copied ? 'Copied' : 'Copy'}
                </Button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Active Data Architecture</span>
            <strong>v1 Canonical (6 Visible Tabs + Hidden Audits)</strong>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Regional & Currency Defaults</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
          <div>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', display: 'block' }}>Application Timezone</span>
            <strong>Asia/Kolkata (IST)</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', display: 'block' }}>Base Currency</span>
            <strong>Indian Rupee (₹ INR)</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
