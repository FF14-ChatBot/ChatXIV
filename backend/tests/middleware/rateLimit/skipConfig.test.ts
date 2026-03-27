import { describe, it, expect } from 'vitest';
import {
  resolveRateLimitConfig,
  shouldSkipRateLimitPath,
} from '@src/middleware/rateLimit/skipConfig.js';

describe('rateLimit skipConfig', () => {
  it('skips health, flags, and admin prefixes', () => {
    expect(shouldSkipRateLimitPath('/health')).toBe(true);
    expect(shouldSkipRateLimitPath('/v1/flags')).toBe(true);
    expect(shouldSkipRateLimitPath('/v1/flags/x')).toBe(true);
    expect(shouldSkipRateLimitPath('/v1/admin/docs')).toBe(true);
  });

  it('does not skip auth or arbitrary API paths', () => {
    expect(shouldSkipRateLimitPath('/v1/auth/login')).toBe(false);
    expect(shouldSkipRateLimitPath('/v1/chat')).toBe(false);
  });

  it('resolveRateLimitConfig returns default until overridden', () => {
    const def = { capacity: 10, refillPerMin: 2 };
    expect(resolveRateLimitConfig('/v1/chat', def)).toBe(def);
  });
});
