import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setFeatureFlagService, getFeatureFlagService } from './featureFlagInstance.js';
import { createMockFeatureFlagService } from '../../test/mocks/featureFlagService.mock.js';

describe('featureFlagInstance', () => {
  beforeEach(() => {
    setFeatureFlagService(createMockFeatureFlagService());
  });

  it('getFeatureFlagService throws when not initialized', async () => {
    vi.resetModules();
    const { getFeatureFlagService: getFresh } = await import('./featureFlagInstance.js');
    expect(() => getFresh()).toThrow('Feature flag service not initialized');
  });

  it('setFeatureFlagService and getFeatureFlagService return the same instance', () => {
    const service = createMockFeatureFlagService();
    setFeatureFlagService(service);
    expect(getFeatureFlagService()).toBe(service);
  });
});
