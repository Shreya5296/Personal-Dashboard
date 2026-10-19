export interface SystemHealthInfo {
  status: 'HEALTHY' | 'DEGRADED' | 'DISCONNECTED';
  backendVersion: string;
  schemaVersion: number;
  environment: string;
  appsScriptConnected: boolean;
}
