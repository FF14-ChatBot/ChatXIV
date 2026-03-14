import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildUrl, request } from './request';

describe('core request', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('buildUrl', () => {
    it('appends path to baseUrl', () => {
      expect(buildUrl('https://api.example.com', '/v1/foo')).toBe('https://api.example.com/v1/foo');
    });
    it('adds leading slash to path if missing', () => {
      expect(buildUrl('https://api.example.com', 'v1/foo')).toBe('https://api.example.com/v1/foo');
    });
  });

  describe('request', () => {
    it('uses custom getHeaders when provided', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal('fetch', fetchMock);

      await request(
        {
          baseUrl: 'https://other.example.com',
          getHeaders: (method) => ({
            'Content-Type': 'application/json',
            'X-Custom': method,
          }),
        },
        'POST',
        '/ingest',
        { body: { x: 1 } }
      );

      expect(fetchMock).toHaveBeenCalledWith(
        'https://other.example.com/ingest',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'X-Custom': 'POST' }),
          body: '{"x":1}',
        })
      );
    });

    it('returns Response so caller can handle status and body', async () => {
      const resBody = { id: '123' };
      vi.stubGlobal('fetch', () =>
        Promise.resolve({
          ok: true,
          status: 201,
          headers: new Headers({ 'Content-Type': 'application/json' }),
          json: () => Promise.resolve(resBody),
        })
      );

      const response = await request({ baseUrl: 'https://api.test' }, 'POST', '/items', {
        body: { name: 'a' },
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
      const data = await (response as Response).json();
      expect(data).toEqual(resBody);
    });

    it('passes signal through to fetch when provided', async () => {
      const ac = new AbortController();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal('fetch', fetchMock);

      await request({ baseUrl: 'https://api.test' }, 'GET', '/items', { signal: ac.signal });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/items',
        expect.objectContaining({
          signal: ac.signal,
        })
      );
    });
  });
});
