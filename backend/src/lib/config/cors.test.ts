import { describe, it, expect } from 'vitest';
import { getCorsOrigin, ALLOWED_CORS_ORIGINS } from './cors.js';

describe('cors', () => {
  describe('ALLOWED_CORS_ORIGINS', () => {
    it('includes production and dev origins', () => {
      expect(ALLOWED_CORS_ORIGINS).toContain('https://chatxiv.com');
      expect(ALLOWED_CORS_ORIGINS).toContain('https://www.chatxiv.com');
      expect(ALLOWED_CORS_ORIGINS).toContain('http://localhost:5173');
    });
  });

  describe('getCorsOrigin', () => {
    it('returns a copy of the allowed origins list', () => {
      const result = getCorsOrigin();
      expect(result).toEqual([...ALLOWED_CORS_ORIGINS]);
      expect(result).not.toBe(ALLOWED_CORS_ORIGINS);
    });
  });
});
