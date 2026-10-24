import React from 'react';
import styles from './topBar.module.css';
import { useAuth } from '../auth/AuthProvider';
import { MenuIcon } from '../components/icons/ActionIcons';
import { AccountDropdown } from './AccountDropdown';
import { NavSection } from './Sidebar';
import { useLiveHeaderTime } from './useLiveHeaderTime';

export interface TopBarProps {
  onToggleMenu?: () => void;
  onNavigate?: (section: NavSection) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleMenu, onNavigate }) => {
  const { user } = useAuth();
  const { dateStr, timeStr } = useLiveHeaderTime();

  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Admin');

  return (
    <header className={styles.topBar}>
      <div className={styles.leftGroup}>
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

        <div className={styles.greetingGroup}>
          <span className={styles.welcomeText}>
            Welcome Back {displayName}!
          </span>

          <div className={styles.dateTimeWrapper} aria-label="Current date and time">
            <span>{dateStr}</span>
            <span>•</span>
            <span className={styles.timeValue}>{timeStr}</span>
          </div>
        </div>
      </div>

      <div className={styles.rightGroup}>
        {user && <AccountDropdown onNavigate={onNavigate} />}
      </div>
    </header>
  );
};
