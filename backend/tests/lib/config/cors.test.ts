import { describe, it, expect, afterEach } from 'vitest';
import { getCorsOrigins } from '@src/lib/config/cors.js';

describe('cors', () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  describe('getCorsOrigins', () => {
    it('returns hardcoded defaults when CORS_ORIGIN is unset', () => {
      delete process.env.CORS_ORIGIN;
      const result = getCorsOrigins();
      expect(result).toContain('https://chatxiv.com');
      expect(result).toContain('https://www.chatxiv.com');
      expect(result).toContain('http://localhost:5173');
      expect(result).toContain('http://127.0.0.1:5173');
      expect(result).toContain('https://dev-www.chatxiv.com');
    });

    it('parses comma-separated CORS_ORIGIN env var', () => {
      process.env.CORS_ORIGIN = 'https://a.com, https://b.com';
      expect(getCorsOrigins()).toEqual(['https://a.com', 'https://b.com']);
    });

    it('handles single origin without comma', () => {
      process.env.CORS_ORIGIN = 'https://a.com';
      expect(getCorsOrigins()).toEqual(['https://a.com']);
    });

    it('filters out empty segments from trailing commas', () => {
      process.env.CORS_ORIGIN = 'https://a.com,,';
      expect(getCorsOrigins()).toEqual(['https://a.com']);
    });
  });
});
