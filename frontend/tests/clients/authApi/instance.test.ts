import { describe, it, expect, vi } from 'vitest';

describe('Auth API client DI', () => {
  it('getAuthApiClient throws when setAuthApiClient was not called', async () => {
    vi.resetModules();
    const { getAuthApiClient } = await import('@/clients/authApi/instance');
    expect(() => getAuthApiClient()).toThrow('Auth API client not initialized');
  });

  it('getAuthApiClient returns the instance after setAuthApiClient is called', async () => {
    vi.resetModules();
    const { setAuthApiClient, getAuthApiClient } = await import('@/clients/authApi/instance');
    const mock = { fetchMe: vi.fn(), logout: vi.fn(), getLoginUrl: vi.fn() };
    setAuthApiClient(mock);
    expect(getAuthApiClient()).toBe(mock);
  });
});
