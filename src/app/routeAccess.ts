import { NavSection } from '../layout/Sidebar';

export interface RouteConfig {
  id: NavSection;
  title: string;
  subtitle: string;
  requiresAdmin: boolean;
}

export const ROUTE_CONFIGS: Record<NavSection, RouteConfig> = {
  dashboard: {
    id: 'dashboard',
    title: 'Dashboard Overview',
    subtitle: 'Operational summary of active students, upcoming classes, and financial metrics.',
    requiresAdmin: true,
  },
  students: {
    id: 'students',
    title: 'Student Directory',
    subtitle: 'Manage student enrollments, class packages, contact details, and records.',
    requiresAdmin: true,
  },
  finances: {
    id: 'finances',
    title: 'Finances',
    subtitle: 'Unified ledger of agreed packages, received tuition, pending balances, and student payment history.',
    requiresAdmin: true,
  },
  fees: {
    id: 'fees',
    title: 'Fee Obligations & Payments',
    subtitle: 'Track invoices, fee schedules, recorded payments, and ledger balances.',
    requiresAdmin: true,
  },
  classes: {
    id: 'classes',
    title: 'Class Sessions & Attendance',
    subtitle: 'Schedule upcoming classes, record attendance outcomes, and manage credit consumption.',
    requiresAdmin: true,
  },
  'meeting-links': {
    id: 'meeting-links',
    title: 'Meeting Links',
    subtitle: 'Maintain verified Google Meet and Zoom links for remote classes.',
    requiresAdmin: true,
  },
  reports: {
    id: 'reports',
    title: 'Earnings Overview',
    subtitle: 'Track collected tuition earnings, invoiced fees, and outstanding balances.',
    requiresAdmin: true,
  },
  settings: {
    id: 'settings',
    title: 'Profile & Preferences',
    subtitle: 'Administrator identity details, display preferences, and regional defaults.',
    requiresAdmin: true,
  },
};
