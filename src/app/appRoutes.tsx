import React from 'react';
import { NavSection } from '../layout/Sidebar';
import { ROUTE_CONFIGS } from './routeAccess';
import { PageHeader } from '../layout/PageHeader';

export interface AppRoutesProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({ activeSection }) => {
  const config = ROUTE_CONFIGS[activeSection] || ROUTE_CONFIGS.dashboard;

  return (
    <div>
      <PageHeader title={config.title} subtitle={config.subtitle} />
      <div
        id={`view-${activeSection}`}
        style={{
          backgroundColor: 'var(--color-bg-surface)',
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border-subtle)',
          marginTop: 'var(--space-4)',
        }}
      >
        <p style={{ color: 'var(--color-text-muted)' }}>
          {config.title} view initialized. Select an action or navigate between modules.
        </p>
      </div>
    </div>
  );
};
