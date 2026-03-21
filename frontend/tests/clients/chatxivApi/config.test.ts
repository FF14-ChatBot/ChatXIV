import { describe, it, expect } from 'vitest';
import { getChatxivApiBaseUrl } from '@/clients/chatxivApi/config';

describe('getChatxivApiBaseUrl', () => {
  it('returns a string', () => {
    expect(typeof getChatxivApiBaseUrl()).toBe('string');
  });

  it('returns empty string when VITE_CHATXIV_BACKEND_URL is unset (same-origin)', () => {
    // Empty env object so local `frontend/.env` cannot change the assertion.
    expect(getChatxivApiBaseUrl({})).toBe('');
  });

  it('returns base URL when set, stripping trailing slash', () => {
    expect(getChatxivApiBaseUrl({ VITE_CHATXIV_BACKEND_URL: 'http://localhost:3000' })).toBe(
      'http://localhost:3000'
    );
    expect(getChatxivApiBaseUrl({ VITE_CHATXIV_BACKEND_URL: 'http://localhost:3000/' })).toBe(
      'http://localhost:3000'
    );
  });
});
