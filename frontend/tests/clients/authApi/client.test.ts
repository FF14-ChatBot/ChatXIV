import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AUTH_BASE_PATH } from '@chatxiv/cdm';
import { createAuthApiClient } from '@/clients/authApi/client';
import type { AuthApiClient } from '@/clients/authApi/types';

vi.mock('@/clients/authApi/config', () => ({
  getAuthApiBaseUrl: () => '',
}));

describe('createAuthApiClient', () => {
  let client: AuthApiClient;

  beforeEach(() => {
    client = createAuthApiClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchMe', () => {
    it('returns AuthMeResponse on 200', async () => {
      const meResponse = { user: { id: 'u1', email: 'a@b.com', isAdmin: false } };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(meResponse),
        })
      );

      const result = await client.fetchMe();
      expect(result).toEqual(meResponse);
      expect(fetch).toHaveBeenCalledWith(
        `${AUTH_BASE_PATH}/me`,
        expect.objectContaining({ method: 'GET', credentials: 'include' })
      );
    });

    it('returns null on 401', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));

      const result = await client.fetchMe();
      expect(result).toBeNull();
    });

    it('throws on non-401 error status', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

      await expect(client.fetchMe()).rejects.toThrow('Auth check failed with status 500');
    });

    it('throws on network failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

      await expect(client.fetchMe()).rejects.toThrow('Network error while fetching auth status');
    });
  });

  describe('logout', () => {
    it('calls POST /v1/auth/logout', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));

      await client.logout();
      expect(fetch).toHaveBeenCalledWith(
        `${AUTH_BASE_PATH}/logout`,
        expect.objectContaining({ method: 'POST', credentials: 'include' })
      );
    });

    it('throws on non-ok response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

      await expect(client.logout()).rejects.toThrow('Logout failed with status 500');
    });

    it('throws on network failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

      await expect(client.logout()).rejects.toThrow('Network error during logout');
    });
  });

  describe('getLoginUrl', () => {
    it('returns the login URL using the base path', () => {
      expect(client.getLoginUrl()).toBe(`${AUTH_BASE_PATH}/login`);
    });
  });
});
