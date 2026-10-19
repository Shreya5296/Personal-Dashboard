export interface ApiMeta {
  requestId: string;
  timestamp: string;
  idempotentRetry?: boolean;
  version?: string;
  total?: number;
  offset?: number;
  limit?: number;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: ApiErrorPayload;
  meta: ApiMeta;
}
