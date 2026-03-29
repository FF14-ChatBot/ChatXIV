import { describe, it, expect } from 'vitest';
import {
  getMaxBodySizeKb,
  getRequestTimeoutMs,
  getRequestConfig,
  getRateLimitConfig,
} from '@src/lib/config/requestConfig.js';
import {
  MAX_JSON_BODY_SIZE_KB,
  RATE_LIMIT_BUCKET_CAPACITY,
  RATE_LIMIT_REFILL_PER_MINUTE,
  REQUEST_TIMEOUT_MS,
} from '@src/lib/config/constants.js';

describe('requestConfig', () => {
  describe('getMaxBodySizeKb', () => {
    it('returns code constant', () => {
      expect(getMaxBodySizeKb()).toBe(MAX_JSON_BODY_SIZE_KB);
    });
  });

  describe('getRequestTimeoutMs', () => {
    it('returns code constant', () => {
      expect(getRequestTimeoutMs()).toBe(REQUEST_TIMEOUT_MS);
    });
  });

  describe('getRequestConfig', () => {
    it('returns requestTimeoutMs and maxBodySizeKb from constants', () => {
      expect(getRequestConfig()).toEqual({
        requestTimeoutMs: REQUEST_TIMEOUT_MS,
        maxBodySizeKb: MAX_JSON_BODY_SIZE_KB,
      });
    });
  });

  describe('getRateLimitConfig', () => {
    it('returns code constants', () => {
      expect(getRateLimitConfig()).toEqual({
        capacity: RATE_LIMIT_BUCKET_CAPACITY,
        refillPerMin: RATE_LIMIT_REFILL_PER_MINUTE,
      });
    });
  });
});
