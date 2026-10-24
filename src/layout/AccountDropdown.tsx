import React, { useState, useRef, useEffect } from 'react';
import styles from './accountDropdown.module.css';
import { useAuth } from '../auth/AuthProvider';
import { NavSection } from './Sidebar';
import { ChevronDownIcon, UserIcon, LogOutIcon } from '../components/icons/ActionIcons';

export interface AccountDropdownProps {
  onNavigate?: (section: NavSection) => void;
}

export const AccountDropdown: React.FC<AccountDropdownProps> = ({ onNavigate }) => {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const profileItemRef = useRef<HTMLButtonElement>(null);
  const logoutItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      profileItemRef.current?.focus();
    }
  }, [isOpen]);

  if (!user) return null;

  const displayName = user.name || (user.email ? user.email.split('@')[0] : 'Admin');
  const userInitial = displayName.charAt(0).toUpperCase() || 'A';

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (document.activeElement === profileItemRef.current) {
        logoutItemRef.current?.focus();
      } else {
        profileItemRef.current?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (document.activeElement === logoutItemRef.current) {
        profileItemRef.current?.focus();
      } else {
        logoutItemRef.current?.focus();
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <div className={styles.container} ref={containerRef} onKeyDown={handleMenuKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Account menu"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
      >
        <div className={styles.avatar} aria-hidden="true">
          {userInitial}
        </div>
        <div className={styles.info}>
          <span className={styles.primaryName}>{displayName}</span>
          <span className={styles.secondaryEmail}>{user.email}</span>
        </div>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} aria-hidden="true">
          <ChevronDownIcon size={14} />
        </span>
      </button>

      {isOpen && (
        <div className={styles.menu} role="menu" aria-label="Account options">
          <button
            ref={profileItemRef}
            type="button"
            role="menuitem"
            className={styles.menuItem}
            onClick={() => {
              setIsOpen(false);
              if (onNavigate) onNavigate('settings');
            }}
          >
            <UserIcon size={16} />
            <span>Profile</span>
          </button>
          <button
            ref={logoutItemRef}
            type="button"
            role="menuitem"
            className={styles.menuItem}
            onClick={() => {
              setIsOpen(false);
              signOut();
            }}
          >
            <LogOutIcon size={16} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};
