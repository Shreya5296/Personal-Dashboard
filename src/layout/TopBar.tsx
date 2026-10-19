import React from 'react';
import styles from './layout.module.css';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/buttons/Button';
import { getRuntimeConfig } from '../config/runtimeConfig';

function getEnvBadge(): { label: string; color: string } | null {
  const cfg = getRuntimeConfig();
  if (cfg.appEnv === 'production' && cfg.appsScriptUrl && !cfg.enableMockAuth) {
    return null; // No badge in a fully configured production environment
  }
  if (!cfg.appsScriptUrl) {
    return { label: 'Unconfigured Backend', color: '#b45309' };
  }
  if (cfg.enableMockAuth || cfg.appEnv !== 'production') {
    return { label: `Development / Mock`, color: '#6d28d9' };
  }
  return null;
}

export const TopBar: React.FC = () => {
  const { user, signOut } = useAuth();
  const badge = getEnvBadge();

  return (
    <header className={styles.topBar}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        {badge && (
          <span style={{
            fontSize: 'var(--font-size-sm)', fontWeight: 600,
            color: badge.color,
            background: `${badge.color}18`,
            padding: '2px 8px', borderRadius: '4px',
            border: `1px solid ${badge.color}40`,
          }}>
            {badge.label}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {user && (
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)' }}>
            {user.name} ({user.email})
          </span>
        )}
        <Button variant="outline" onClick={signOut}>
          Sign Out
        </Button>
      </div>
    </header>
  );
};
