import React, { useState } from 'react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <Sidebar
        activeSection={activeSection}
        onNavigate={onNavigate}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <div className={styles.mainArea}>
        <TopBar
          onToggleMenu={() => setMobileMenuOpen((open) => !open)}
          onNavigate={onNavigate}
        />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
};
