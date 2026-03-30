import { vi, type Mocked } from 'vitest';
import type { FeatureFlagService } from '@src/lib/featureFlags/types.js';

export function createMockFeatureFlagService(): Mocked<FeatureFlagService> {
  return {
    list: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 }),
    getEntry: vi.fn().mockImplementation(async (name: string) => ({
      name,
      enabled: false,
    })),
    setFlag: vi.fn().mockResolvedValue({ name: '', enabled: false, updatedAt: '' }),
    removeFlag: vi.fn().mockResolvedValue(undefined),
  } as Mocked<FeatureFlagService>;
}
