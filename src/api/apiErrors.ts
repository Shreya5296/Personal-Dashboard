import { ApiErrorPayload } from './apiResponse';

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown> | null;
  public readonly requestId?: string;

  constructor(payload: ApiErrorPayload, requestId?: string) {
    super(payload.message || 'API request failed');
    this.name = 'ApiClientError';
    this.code = payload.code || 'UNKNOWN_ERROR';
    this.details = payload.details;
    this.requestId = requestId;
  }
}

export class ApiNetworkError extends Error {
  constructor(message = 'Network error: unable to reach server', public readonly cause?: unknown) {
    super(message);
    this.name = 'ApiNetworkError';
  }
}

export function isAuthError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    return error.code === 'UNAUTHENTICATED' || error.code === 'FORBIDDEN' || error.code === 'TOKEN_EXPIRED';
  }
  return false;
}
