import React from 'react';
import styles from './layout.module.css';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/buttons/Button';
import { getRuntimeConfig } from '../config/runtimeConfig';
import { MenuIcon } from '../components/icons/ActionIcons';

export interface TopBarProps {
  onToggleMenu?: () => void;
}

function getEnvBadge(): { label: string; color: string; bg: string } | null {
  const cfg = getRuntimeConfig();
  if (cfg.appEnv === 'production' && cfg.appsScriptUrl && !cfg.enableMockAuth) {
    return null;
  }
  if (cfg.useMockData) {
    return { label: 'Demo / Mock Data', color: '#0284c7', bg: '#f0f9ff' };
  }
  if (!cfg.appsScriptUrl) {
    return { label: 'Unconfigured Backend', color: '#b45309', bg: '#fef3c7' };
  }
  if (cfg.enableMockAuth || cfg.appEnv !== 'production') {
    return { label: 'Development / Mock', color: '#4338ca', bg: '#e0e7ff' };
  }
  return null;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleMenu }) => {
  const { user, signOut } = useAuth();
  const badge = getEnvBadge();

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  return (
    <header className={styles.topBar}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {onToggleMenu && (
          <button
            type="button"
            className={styles.menuToggle}
            onClick={onToggleMenu}
            aria-label="Toggle navigation menu"
          >
            <MenuIcon size={20} />
          </button>
        )}
        {badge && (
          <span
            style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              color: badge.color,
              background: badge.bg,
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${badge.color}30`,
              letterSpacing: '0.01em',
            }}
          >
            {badge.label}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-primary-bg)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 700,
                border: '1px solid var(--color-primary-border)',
              }}
            >
              {userInitial}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-main)' }}>
                {user.name}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {user.email}
              </span>
            </div>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={signOut}>
          Sign Out
        </Button>
      </div>
    </header>
  );
};
