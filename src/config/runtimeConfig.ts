export interface RuntimeConfig {
  appsScriptUrl: string;
  enableMockAuth: boolean;
  useMockData: boolean;
  appEnv: 'development' | 'production' | 'test';
}

export function getRuntimeConfig(): RuntimeConfig {
  const env: Record<string, string | undefined> =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env as unknown as Record<string, string | undefined>)
      : {};

  const mode = env.MODE || 'development';
  let isMock = env.VITE_USE_MOCK_DATA === 'true';
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('smd_use_mock_data') === 'true') {
      isMock = true;
    }
  } catch {
    // Ignore storage restrictions
  }

  return {
    appsScriptUrl: env.VITE_APPS_SCRIPT_URL || env.VITE_APPS_SCRIPT_API_URL || '',
    enableMockAuth: env.VITE_ENABLE_MOCK_AUTH === 'true' || mode === 'development' || mode === 'test',
    useMockData: isMock && mode !== 'production',
    appEnv: (mode as 'development' | 'production' | 'test') || 'development',
  };
}
