import { sendApiRequest } from '../../api/apiClient';
import { DashboardOverviewData } from './dashboardTypes';

export async function fetchDashboardOverview(token?: string | null): Promise<DashboardOverviewData> {
  const response = await sendApiRequest<DashboardOverviewData>(
    'dashboard.overview',
    {},
    { token }
  );
  return response.data || {
    activeStudentsCount: 0,
    classesUpcoming7Days: 0,
    outstandingFeesTotal: 0,
    currency: 'INR',
  };
}
