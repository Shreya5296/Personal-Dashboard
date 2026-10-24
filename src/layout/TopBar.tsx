import React from 'react';
import styles from './layout.module.css';
import { useAuth } from '../auth/AuthProvider';
import { getRuntimeConfig } from '../config/runtimeConfig';
import { MenuIcon } from '../components/icons/ActionIcons';
import { AccountDropdown } from './AccountDropdown';
import { NavSection } from './Sidebar';

export interface TopBarProps {
  onToggleMenu?: () => void;
  onNavigate?: (section: NavSection) => void;
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

export const TopBar: React.FC<TopBarProps> = ({ onToggleMenu, onNavigate }) => {
  const { user } = useAuth();
  const badge = getEnvBadge();

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

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {user && <AccountDropdown onNavigate={onNavigate} />}
      </div>
    </header>
  );
};
