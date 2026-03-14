/** Token bucket: burst of `capacity`, then `refillPerMin` tokens per minute. */
export interface RateLimitConfig {
  capacity: number;
  refillPerMin: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export interface RateLimitStore {
  consume(key: string, config: RateLimitConfig): RateLimitResult;
}
