import React from 'react';
import styles from './layout.module.css';
import { APP_NAME } from '../config/publicConfig';
import {
  DashboardIcon,
  StudentsIcon,
  FeesIcon,
  ClassesIcon,
  MeetingLinksIcon,
  ImportsIcon,
  ReportsIcon,
  SettingsIcon,
} from '../components/icons/NavIcons';
import { CloseIcon } from '../components/icons/ActionIcons';

export type NavSection =
  | 'dashboard'
  | 'students'
  | 'fees'
  | 'classes'
  | 'meeting-links'
  | 'imports'
  | 'reports'
  | 'settings';

export interface SidebarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { id: 'dashboard' as NavSection, label: 'Dashboard', Icon: DashboardIcon },
  { id: 'students' as NavSection, label: 'Students', Icon: StudentsIcon },
  { id: 'fees' as NavSection, label: 'Fees & Payments', Icon: FeesIcon },
  { id: 'classes' as NavSection, label: 'Classes', Icon: ClassesIcon },
  { id: 'meeting-links' as NavSection, label: 'Meeting Links', Icon: MeetingLinksIcon },
  { id: 'imports' as NavSection, label: 'Import & Reconcile', Icon: ImportsIcon },
  { id: 'reports' as NavSection, label: 'Reports', Icon: ReportsIcon },
  { id: 'settings' as NavSection, label: 'Settings', Icon: SettingsIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onNavigate,
  isOpen = true,
  onClose,
}) => {
  return (
    <>
      {isOpen && onClose && (
        <div
          className={styles.sidebarBackdrop}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside className={`${styles.sidebar} ${!isOpen ? styles.sidebarClosed : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.brandWrapper}>
            <span className={styles.brandTitle}>{APP_NAME}</span>
            <span className={styles.brandSubtitle}>Tutor Administration</span>
          </div>
          {onClose && (
            <button
              type="button"
              className={styles.menuToggle}
              onClick={onClose}
              aria-label="Close sidebar"
            >
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
                onClick={() => {
                  onNavigate(id);
                  if (onClose) onClose();
                }}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
