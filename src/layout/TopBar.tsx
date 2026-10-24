import React from 'react';
import styles from './layout.module.css';
import { useAuth } from '../auth/AuthProvider';
import { MenuIcon } from '../components/icons/ActionIcons';
import { AccountDropdown } from './AccountDropdown';
import { NavSection } from './Sidebar';

export interface TopBarProps {
  onToggleMenu?: () => void;
  onNavigate?: (section: NavSection) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleMenu, onNavigate }) => {
  const { user } = useAuth();

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
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {user && <AccountDropdown onNavigate={onNavigate} />}
      </div>
    </header>
  );
};
