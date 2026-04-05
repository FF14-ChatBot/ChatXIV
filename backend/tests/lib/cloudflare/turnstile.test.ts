import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyTurnstileToken } from '@src/lib/cloudflare/turnstile.js';
import { ENV_KEYS } from '@src/lib/config/constants.js';

describe('verifyTurnstileToken', () => {
  const saved = { ...process.env };
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env = { ...saved };
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...saved };
  });

  it('returns ok: false when secret is missing', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env[ENV_KEYS.TURNSTILE_SECRET_KEY];
    const r = await verifyTurnstileToken('tok', undefined);
    expect(r).toEqual({ ok: false, errorCodes: ['missing-secret'], reason: 'missing_secret' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls siteverify and returns ok on success', async () => {
    process.env.NODE_ENV = 'production';
    process.env[ENV_KEYS.TURNSTILE_SECRET_KEY] = 'secret-x';
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });

    const r = await verifyTurnstileToken('  client-token  ', '203.0.113.1');
    expect(r).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('siteverify');
    expect(init.method).toBe('POST');
    expect((init.body as string).toString()).toContain('secret-x');
    expect((init.body as string).toString()).toContain('client-token');
    expect((init.body as string).toString()).toContain('203.0.113.1');
  });

  it('returns ok: false when siteverify says failure', async () => {
    process.env.NODE_ENV = 'production';
    process.env[ENV_KEYS.TURNSTILE_SECRET_KEY] = 'secret-x';
    fetchMock.mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: false,
          'error-codes': ['timeout-or-duplicate'],
        }),
    });
    const r = await verifyTurnstileToken('t', undefined);
    expect(r).toEqual({
      ok: false,
      errorCodes: ['timeout-or-duplicate'],
      reason: 'siteverify',
    });
  });
});
