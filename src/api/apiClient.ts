import { generateRequestId } from './requestId';
import { ApiResponse } from './apiResponse';
import { ApiClientError, ApiNetworkError } from './apiErrors';
import { getRuntimeConfig } from '../config/runtimeConfig';

export interface RequestOptions {
  token?: string | null;
  requestId?: string;
  timeoutMs?: number;
}

export async function sendApiRequest<T = unknown>(
  operation: string,
  payload: Record<string, unknown> = {},
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const config = getRuntimeConfig();
  const url = config.appsScriptUrl;
  const requestId = options.requestId || generateRequestId();

  const bodyData = {
    operation,
    token: options.token || undefined,
    requestId,
    data: payload,
  };

  if (!url) {
    throw new ApiClientError({
      code: 'CONFIGURATION_ERROR',
      message: 'Apps Script API URL is not configured. Set VITE_APPS_SCRIPT_URL.',
    }, requestId);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(bodyData),
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new ApiNetworkError(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const json: ApiResponse<T> = await response.json();

    if (!json.ok && json.error) {
      throw new ApiClientError(json.error, json.meta?.requestId || requestId);
    }

    return json;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof ApiClientError || err instanceof ApiNetworkError) {
      throw err;
    }
    if ((err as Error)?.name === 'AbortError') {
      throw new ApiNetworkError('Request timed out');
    }
    throw new ApiNetworkError('Network request failed', err);
  }
}
