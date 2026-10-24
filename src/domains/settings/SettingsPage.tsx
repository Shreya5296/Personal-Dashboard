import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { usePageTitle } from '../../hooks/usePageTitle';
import { PageHeader } from '../../layout/PageHeader';
import { Button } from '../../components/buttons/Button';
import { InlineNotice } from '../../components/feedback/InlineNotice';
import { RegionalPreferencesCard } from './RegionalPreferencesCard';
import formStyles from '../../components/forms/forms.module.css';

export const SettingsPage: React.FC = () => {
  usePageTitle('Profile & Preferences');
  const { user, updateDisplayName } = useAuth();
  const [nameInput, setNameInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.name) {
      setNameInput(user.name);
    }
  }, [user?.name]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setErrorMessage('Display name cannot be empty.');
      return;
    }
    setErrorMessage(null);
    updateDisplayName(trimmed);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const isUnchanged = user?.name ? nameInput.trim() === user.name : false;
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-surface)',
    padding: '1.25rem 1.5rem',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--color-border-subtle)',
    boxShadow: 'var(--shadow-xs)',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)',
        maxWidth: '720px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      <PageHeader
        title="Profile & Preferences"
        subtitle="Manage administrator display identity and view regional defaults."
      />

      {saveSuccess && (
        <InlineNotice type="success" message="Display name saved successfully." onDismiss={() => setSaveSuccess(false)} />
      )}
      {errorMessage && (
        <InlineNotice type="danger" message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      )}

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
          Administrator Profile
        </h3>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className={formStyles.field}>
            <label htmlFor="displayNameInput" className={formStyles.label}>
              Administrator Display Name
            </label>
            <input
              id="displayNameInput"
              type="text"
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                setSaveSuccess(false);
                setErrorMessage(null);
              }}
              placeholder="e.g. Ashreya"
              className={formStyles.input}
            />
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Displayed in the navigation header and account menu across sessions.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', display: 'block' }}>Account Email (Read-only)</span>
              <strong>{user?.email || 'ashreya0502@gmail.com'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', display: 'block' }}>Authorization Status</span>
              <span style={{ color: '#059669', fontWeight: 600 }}>● Primary Authorized Admin</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: 'var(--space-2)' }}>
            <Button type="submit" disabled={isUnchanged || !nameInput.trim()}>
              Save Display Name
            </Button>
          </div>
        </form>
      </div>

      <RegionalPreferencesCard />
    </div>
  );
};
