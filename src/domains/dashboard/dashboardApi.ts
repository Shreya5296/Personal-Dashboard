import { sendApiRequest } from '../../api/apiClient';
import { DashboardOverviewData } from './dashboardTypes';

export async function fetchDashboardOverview(token?: string | null): Promise<DashboardOverviewData> {
  const response = await sendApiRequest<Record<string, unknown>>(
    'dashboard.overview',
    {},
    { token }
  );
  const data = response.data || {};
  return {
    activeStudentsCount: Number(data.activeStudentsCount || 0),
    classesUpcoming7Days: Number(data.classesUpcoming7Days ?? data.upcomingClassesCount ?? 0),
    outstandingFeesTotal: Number(data.outstandingFeesTotal ?? data.overdueFeesTotal ?? 0),
    currency: String(data.currency || 'INR'),
  };
}
