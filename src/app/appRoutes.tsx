import React from 'react';
import { NavSection } from '../layout/Sidebar';
import { DashboardPage } from '../domains/dashboard/DashboardPage';
import { StudentsPage } from '../domains/students/StudentsPage';
import { FinancesPage } from '../domains/finances/FinancesPage';
import { ClassesPage } from '../domains/classes/ClassesPage';
import { MeetingLinksPage } from '../domains/meeting-links/MeetingLinksPage';
import { SettingsPage } from '../domains/settings/SettingsPage';

export interface AppRoutesProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({ activeSection, onNavigate }) => {
  switch (activeSection) {
    case 'dashboard':
      return <DashboardPage onNavigate={onNavigate} />;
    case 'students':
      return <StudentsPage />;
    case 'finances':
    case 'fees':
    case 'reports':
      return <FinancesPage />;
    case 'classes':
      return <ClassesPage />;
    case 'meeting-links':
      return <MeetingLinksPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardPage onNavigate={onNavigate} />;
  }
};
