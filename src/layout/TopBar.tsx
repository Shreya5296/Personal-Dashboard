import React from 'react';
import styles from './layout.module.css';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/buttons/Button';

export const TopBar: React.FC = () => {
  const { user, signOut } = useAuth();

  return (
    <header className={styles.topBar}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-muted)' }}>
          Environment: Production-ready
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {user && (
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)' }}>
            {user.name} ({user.email})
          </span>
        )}
        <Button variant="outline" onClick={signOut}>
          Sign Out
        </Button>
      </div>
    </header>
  );
};
