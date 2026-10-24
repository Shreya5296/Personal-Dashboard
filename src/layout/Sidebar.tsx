import React from 'react';
import styles from './layout.module.css';
import footerStyles from './sidebarFooter.module.css';
import { APP_NAME } from '../config/publicConfig';
import { useAuth } from '../auth/AuthProvider';
import {
  DashboardIcon,
  CalendarIcon,
  StudentsIcon,
  FeesIcon,
  ClassesIcon,
  MeetingLinksIcon,
} from '../components/icons/NavIcons';
import { CloseIcon } from '../components/icons/ActionIcons';

export type NavSection =
  | 'dashboard'
  | 'calendar'
  | 'students'
  | 'finances'
  | 'classes'
  | 'meeting-links'
  | 'settings'
  | 'fees'
  | 'reports';

export interface SidebarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { id: 'dashboard' as NavSection, label: 'Dashboard', Icon: DashboardIcon },
  { id: 'calendar' as NavSection, label: 'Calendar', Icon: CalendarIcon },
  { id: 'students' as NavSection, label: 'Students', Icon: StudentsIcon },
  { id: 'classes' as NavSection, label: 'Class Schedule', Icon: ClassesIcon },
  { id: 'finances' as NavSection, label: 'Finances', Icon: FeesIcon },
  { id: 'meeting-links' as NavSection, label: 'Meeting Links', Icon: MeetingLinksIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onNavigate,
  isOpen = true,
  onClose,
}) => {
  const { user, signOut } = useAuth();
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Admin');
  const initial = (displayName[0] || 'A').toUpperCase();

  const handleNav = (section: NavSection) => {
    onNavigate(section);
    if (onClose) onClose();
  };

  return (
    <>
      {isOpen && onClose && (
        <div className={styles.sidebarBackdrop} onClick={onClose} aria-hidden="true" />
      )}
      <aside className={`${styles.sidebar} ${!isOpen ? styles.sidebarClosed : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.brandWrapper}>
            <span className={styles.brandTitle}>{APP_NAME}</span>
          </div>
          {onClose && (
            <button type="button" className={styles.menuToggle} onClick={onClose} aria-label="Close sidebar">
              <CloseIcon size={18} />
            </button>
          )}
        </div>

        <nav className={styles.nav} aria-label="Main Navigation">
          {navItems.map(({ id, label, Icon }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                onClick={() => handleNav(id)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {user && (
          <div className={footerStyles.sidebarFooter}>
            <div className={footerStyles.userProfileRow}>
              <div className={footerStyles.userAvatar} aria-hidden="true">{initial}</div>
              <div className={footerStyles.userInfo}>
                <span className={footerStyles.userName} title={displayName}>{displayName}</span>
                <span className={footerStyles.userEmail}>{user.email || 'Administrator'}</span>
              </div>
            </div>
            <div className={footerStyles.sidebarActions}>
              <button
                type="button"
                className={footerStyles.settingsAction}
                onClick={() => handleNav('settings')}
                title="Settings & Regional Preferences"
              >
                Settings
              </button>
              <button
                type="button"
                className={footerStyles.logoutAction}
                onClick={signOut}
                title="Log out of session"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
