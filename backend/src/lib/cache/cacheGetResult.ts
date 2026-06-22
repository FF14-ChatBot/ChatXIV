export const CacheGetOutcome = {
  Hit: 'hit',
  Miss: 'miss',
  Unavailable: 'unavailable',
} as const;

export type CacheGetOutcome = (typeof CacheGetOutcome)[keyof typeof CacheGetOutcome];

export type CacheGetResult<T> =
  | { readonly outcome: typeof CacheGetOutcome.Hit; readonly value: T }
  | { readonly outcome: typeof CacheGetOutcome.Miss }
  | {
      readonly outcome: typeof CacheGetOutcome.Unavailable;
      readonly cause?: Error;
    };

export function cacheHit<T>(value: T): CacheGetResult<T> {
  return { outcome: CacheGetOutcome.Hit, value };
}

export function cacheMiss<T>(): CacheGetResult<T> {
  return { outcome: CacheGetOutcome.Miss };
}

export function cacheUnavailable<T>(cause?: Error): CacheGetResult<T> {
  return { outcome: CacheGetOutcome.Unavailable, ...(cause ? { cause } : {}) };
}
