import { describe, it, expect, afterEach } from 'vitest';
import {
  getMaxBodySizeKb,
  getRequestTimeoutMs,
  getRequestConfig,
  getRateLimitConfig,
} from '@src/lib/config/requestConfig.js';

describe('requestConfig', () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  describe('getMaxBodySizeKb', () => {
    it('returns default 50 when env unset', () => {
      delete process.env.MAX_BODY_SIZE_KB;
      expect(getMaxBodySizeKb()).toBe(50);
    });
    it('parses env value', () => {
      process.env.MAX_BODY_SIZE_KB = '100';
      expect(getMaxBodySizeKb()).toBe(100);
    });
    it('returns default when env is not a number', () => {
      process.env.MAX_BODY_SIZE_KB = 'invalid';
      expect(getMaxBodySizeKb()).toBe(50);
    });
  });

  describe('getRequestTimeoutMs', () => {
    it('returns default 30000 when env unset', () => {
      delete process.env.REQUEST_TIMEOUT_MS;
      expect(getRequestTimeoutMs()).toBe(30_000);
    });
    it('parses env value', () => {
      process.env.REQUEST_TIMEOUT_MS = '15000';
      expect(getRequestTimeoutMs()).toBe(15_000);
    });
  });

  describe('getRequestConfig', () => {
    it('returns requestTimeoutMs and maxBodySizeKb from env', () => {
      delete process.env.REQUEST_TIMEOUT_MS;
      delete process.env.MAX_BODY_SIZE_KB;
      expect(getRequestConfig()).toEqual({
        requestTimeoutMs: 30_000,
        maxBodySizeKb: 50,
      });
    });
    it('parses env values', () => {
      process.env.REQUEST_TIMEOUT_MS = '5000';
      process.env.MAX_BODY_SIZE_KB = '100';
      expect(getRequestConfig()).toEqual({
        requestTimeoutMs: 5_000,
        maxBodySizeKb: 100,
      });
    });
  });

  describe('getRateLimitConfig', () => {
    it('returns defaults when env unset', () => {
      delete process.env.RATE_LIMIT_CAPACITY;
      delete process.env.RATE_LIMIT_REFILL_PER_MIN;
      expect(getRateLimitConfig()).toEqual({ capacity: 20, refillPerMin: 4 });
    });
    it('parses env values', () => {
      process.env.RATE_LIMIT_CAPACITY = '20';
      process.env.RATE_LIMIT_REFILL_PER_MIN = '5';
      expect(getRateLimitConfig()).toEqual({ capacity: 20, refillPerMin: 5 });
    });
  });
});
