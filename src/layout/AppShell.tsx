import React from 'react';
import styles from './layout.module.css';
import { Sidebar, NavSection } from './Sidebar';
import { TopBar } from './TopBar';

export interface AppShellProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeSection,
  onNavigate,
  children,
}) => {
  return (
    <div className={styles.shell}>
      <Sidebar activeSection={activeSection} onNavigate={onNavigate} />
      <div className={styles.mainArea}>
        <TopBar />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
};
