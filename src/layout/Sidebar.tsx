import React from 'react';
import styles from './layout.module.css';
import { APP_NAME } from '../config/publicConfig';

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
}

const navItems: { id: NavSection; label: string }[] = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'students', label: '🎓 Students' },
  { id: 'fees', label: '💰 Fees & Payments' },
  { id: 'classes', label: '📅 Classes' },
  { id: 'meeting-links', label: '🔗 Meeting Links' },
  { id: 'imports', label: '📥 Import & Reconcile' },
  { id: 'reports', label: '📈 Reports' },
  { id: 'settings', label: '⚙️ Settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeSection, onNavigate }) => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <span>{APP_NAME}</span>
      </div>
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.navItem} ${activeSection === item.id ? styles.navItemActive : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
};
