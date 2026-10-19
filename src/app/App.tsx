import React, { useState } from 'react';
import { AppProviders } from './AppProviders';
import { RequireAdmin } from '../auth/RequireAdmin';
import { AppShell } from '../layout/AppShell';
import { NavSection } from '../layout/Sidebar';
import { AppRoutes } from './appRoutes';

export const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');

  return (
    <AppProviders>
      <RequireAdmin>
        <AppShell activeSection={activeSection} onNavigate={setActiveSection}>
          <AppRoutes activeSection={activeSection} onNavigate={setActiveSection} />
        </AppShell>
      </RequireAdmin>
    </AppProviders>
  );
};
