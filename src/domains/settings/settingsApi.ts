import { sendApiRequest } from '../../api/apiClient';
import { SystemHealthInfo } from './settingsTypes';

export async function fetchHealthInfo(token?: string | null): Promise<SystemHealthInfo> {
  try {
    const response = await sendApiRequest<{ status: string; schemaVersion: number }>(
      'system.health',
      {},
      { token, timeoutMs: 5000 }
    );
    return {
      status: 'HEALTHY',
      backendVersion: '1.0.0',
      schemaVersion: response.data?.schemaVersion || 1,
      environment: 'Verified',
      appsScriptConnected: true,
    };
  } catch {
    return {
      status: 'DISCONNECTED',
      backendVersion: '1.0.0',
      schemaVersion: 1,
      environment: 'Local / Synthetic Standby',
      appsScriptConnected: false,
    };
  }
}
