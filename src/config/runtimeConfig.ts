export interface RuntimeConfig {
  appsScriptUrl: string;
  enableMockAuth: boolean;
  appEnv: 'development' | 'production' | 'test';
}

export function getRuntimeConfig(): RuntimeConfig {
  const env: Record<string, string | undefined> =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env as unknown as Record<string, string | undefined>)
      : {};

  const mode = env.MODE || 'development';

  return {
    appsScriptUrl: env.VITE_APPS_SCRIPT_URL || env.VITE_APPS_SCRIPT_API_URL || '',
    enableMockAuth: env.VITE_ENABLE_MOCK_AUTH === 'true' || mode === 'development' || mode === 'test',
    appEnv: (mode as 'development' | 'production' | 'test') || 'development',
  };
}
