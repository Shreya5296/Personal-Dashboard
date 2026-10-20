import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendApiRequest } from '../../src/api/apiClient';
import { fetchStudents } from '../../src/domains/students/studentApi';
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

  it('fetchStudents robustly parses direct array, data.students, or data.items', async () => {
    vi.spyOn(configModule, 'getRuntimeConfig').mockReturnValue({
      appsScriptUrl: 'https://script.google.com/macros/s/test/exec',
      googleClientId: 'test-client',
      enableMockAuth: true,
      appEnv: 'test',
    });

    const mockStudents = [{ student_id: 'stu_1', full_name: 'Test Student' }];

    // 1. Direct array in data
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: mockStudents }),
    });
    const res1 = await fetchStudents();
    expect(res1).toHaveLength(1);
    expect(res1[0].student_id).toBe('stu_1');

    // 2. Wrapped in data.students
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { students: mockStudents } }),
    });
    const res2 = await fetchStudents();
    expect(res2).toHaveLength(1);

    // 3. Wrapped in data.items
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { items: mockStudents } }),
    });
    const res3 = await fetchStudents();
    expect(res3).toHaveLength(1);

    // 4. Empty or missing data
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: null }),
    });
    const res4 = await fetchStudents();
    expect(res4).toHaveLength(0);
  });
});
