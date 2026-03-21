import { vi, type Mocked } from 'vitest';
import type { FeatureFlagService } from '../../lib/featureFlags/types.js';

export function createMockFeatureFlagService(): Mocked<FeatureFlagService> {
  return {
    getAll: vi.fn().mockResolvedValue([]),
    getEntry: vi.fn().mockImplementation(async (name: string) => ({
      name,
      enabled: false,
    })),
    setFlag: vi.fn().mockResolvedValue({ name: '', enabled: false, updatedAt: '' }),
    removeFlag: vi.fn().mockResolvedValue(undefined),
  } as Mocked<FeatureFlagService>;
}
