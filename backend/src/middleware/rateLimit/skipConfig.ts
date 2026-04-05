import type { RateLimitConfig } from './types.js';

/**
 * Path prefixes that bypass the global rate limiter (liveness probes, cheap public reads, admin).
 * Keep this list short; prefer route-specific limits via {@link resolveRateLimitConfig} when chat lands.
 */
export const RATE_LIMIT_SKIP_PATH_PREFIXES: readonly string[] = [
  '/health',
  '/v1/flags',
  '/v1/admin',
];

export function shouldSkipRateLimitPath(path: string): boolean {
  return RATE_LIMIT_SKIP_PATH_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));
}

/**
 * Per-route bucket tuning. Defaults to DI `RateLimitConfig`; extend with path prefixes as features grow.
 * Example: `if (path.startsWith('/v1/chat')) return { capacity: 60, refillPerMin: 30 };`
 */
export function resolveRateLimitConfig(
  path: string,
  defaultConfig: RateLimitConfig
): RateLimitConfig {
  void path;
  return defaultConfig;
}
