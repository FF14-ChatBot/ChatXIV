import { vi, type Mocked } from 'vitest';
import type { FeatureFlagStore } from '../../lib/featureFlags/types.js';

export function createMockFeatureFlagStore(): Mocked<FeatureFlagStore> {
  return {
    get: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(false),
  } as Mocked<FeatureFlagStore>;
}
