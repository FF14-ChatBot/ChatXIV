import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IS_PRODUCT_LIVE, featureFlagEntryPath } from '@chatxiv/cdm';
import { setChatxivApiClient } from '@/clients/chatxivApi/instance';
import { createChatxivApiClient } from '@/clients/chatxivApi/client';
import { fetchFeatureFlagEntry } from '@/clients/chatxivApi/featureFlags';

describe('fetchFeatureFlagEntry', () => {
  beforeEach(() => {
    setChatxivApiClient(createChatxivApiClient());
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GETs /v1/flags/:name with encoded flag name', async () => {
    const entry = { name: IS_PRODUCT_LIVE, enabled: true, updatedAt: '2025-01-01T00:00:00.000Z' };
    const jsonMock = vi.fn().mockResolvedValue(entry);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: jsonMock,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchFeatureFlagEntry(IS_PRODUCT_LIVE, {
      config: { baseUrl: 'http://localhost:3000' },
    });

    expect(result).toEqual(entry);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:3000${featureFlagEntryPath(IS_PRODUCT_LIVE)}`,
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Request-Id': 'test-uuid',
        }),
      })
    );
  });
});
