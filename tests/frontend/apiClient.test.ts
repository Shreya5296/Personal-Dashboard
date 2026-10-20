import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendApiRequest } from '../../src/api/apiClient';
import { ApiClientError, ApiNetworkError } from '../../src/api/apiErrors';
import * as configModule from '../../src/config/runtimeConfig';

describe('Frontend API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fails with ApiClientError if appsScriptUrl is missing and url empty', async () => {
    vi.spyOn(configModule, 'getRuntimeConfig').mockReturnValue({
      appsScriptUrl: '',
      googleClientId: '',
      enableMockAuth: true,
      appEnv: 'test',
    });

    await expect(
      sendApiRequest('students.list', {})
    ).rejects.toThrow(ApiClientError);
  });

  it('sends simple POST request with text/plain and parses success response', async () => {
    const mockResponse = {
      ok: true,
      data: [{ student_id: 'stu_1', full_name: 'Test Student' }],
      meta: { requestId: 'req_123', timestamp: '2026-03-15T10:00:00.000Z' },
    };

    vi.spyOn(configModule, 'getRuntimeConfig').mockReturnValue({
      appsScriptUrl: 'https://script.google.com/macros/s/test/exec',
      googleClientId: 'test-client',
      enableMockAuth: true,
      appEnv: 'test',
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await sendApiRequest('students.list', { query: 'test' });
    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://script.google.com/macros/s/test/exec',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow',
      })
    );
  });

  it('throws ApiClientError when response has ok: false', async () => {
    vi.spyOn(configModule, 'getRuntimeConfig').mockReturnValue({
      appsScriptUrl: 'https://script.google.com/macros/s/test/exec',
      googleClientId: 'test-client',
      enableMockAuth: true,
      appEnv: 'test',
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: 'Missing token' },
        meta: { requestId: 'req_err' },
      }),
    });

    await expect(sendApiRequest('students.list')).rejects.toThrow(ApiClientError);
  });

  it('throws ApiNetworkError when fetch rejects', async () => {
    vi.spyOn(configModule, 'getRuntimeConfig').mockReturnValue({
      appsScriptUrl: 'https://script.google.com/macros/s/test/exec',
      googleClientId: 'test-client',
      enableMockAuth: true,
      appEnv: 'test',
    });

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network down'));
    await expect(sendApiRequest('students.list')).rejects.toThrow(ApiNetworkError);
  });

  it('throws ApiNetworkError when response body is non-JSON HTML (e.g., auth redirect)', async () => {
    vi.spyOn(configModule, 'getRuntimeConfig').mockReturnValue({
      appsScriptUrl: 'https://script.google.com/macros/s/test/exec',
      googleClientId: 'test-client',
      enableMockAuth: true,
      appEnv: 'test',
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token '<', '<!DOCTYPE '... is not valid JSON");
      },
    });

    await expect(sendApiRequest('auth.login', { key: 'invalid' })).rejects.toThrow(ApiNetworkError);
  });
});
