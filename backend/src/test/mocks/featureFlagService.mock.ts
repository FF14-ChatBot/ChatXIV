import { vi, type Mocked } from 'vitest';
import type { FeatureFlagService } from '../../lib/featureFlags/types.js';

export function createMockFeatureFlagService(): Mocked<FeatureFlagService> {
  return {
    getAll: vi.fn().mockResolvedValue([]),
    setFlag: vi.fn().mockResolvedValue({ name: '', enabled: false, updatedAt: '' }),
    removeFlag: vi.fn().mockResolvedValue(undefined),
    isEnabled: vi.fn().mockResolvedValue(false),
  } as Mocked<FeatureFlagService>;
}
