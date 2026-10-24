import React from 'react';
import styles from './topBar.module.css';
import { useAuth } from '../auth/AuthProvider';
import { MenuIcon } from '../components/icons/ActionIcons';
import { NavSection } from './Sidebar';
import { useLiveHeaderTime } from './useLiveHeaderTime';

export interface TopBarProps {
  onToggleMenu?: () => void;
  onNavigate?: (section: NavSection) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleMenu }) => {
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

        <span className={styles.welcomeText}>
          Welcome Back {displayName}!
        </span>
      </div>

      <div className={styles.rightGroup}>
        <div className={styles.dateTimeWrapper} aria-label="Current date and time">
          <span className={styles.dateLabel}>{dateStr}</span>
          <span className={styles.dateDot}>•</span>
          <span className={styles.timeValue}>{timeStr}</span>
        </div>
      </div>
    </header>
  );
};
