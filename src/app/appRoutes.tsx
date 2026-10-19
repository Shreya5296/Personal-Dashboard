import React from 'react';
import { NavSection } from '../layout/Sidebar';
import { DashboardPage } from '../domains/dashboard/DashboardPage';
import { StudentsPage } from '../domains/students/StudentsPage';
import { FeesPage } from '../domains/fees/FeesPage';
import { ClassesPage } from '../domains/classes/ClassesPage';
import { MeetingLinksPage } from '../domains/meeting-links/MeetingLinksPage';
import { ImportPage } from '../domains/imports/ImportPage';
import { ReportsPage } from '../domains/reports/ReportsPage';
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
    case 'fees':
      return <FeesPage />;
    case 'classes':
      return <ClassesPage />;
    case 'meeting-links':
      return <MeetingLinksPage />;
    case 'imports':
      return <ImportPage />;
    case 'reports':
      return <ReportsPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardPage onNavigate={onNavigate} />;
  }
};
