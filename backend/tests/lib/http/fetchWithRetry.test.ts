import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RetryingHttpClient, type RetryingHttpClientConfig } from '@src/lib/http/fetchWithRetry.js';
import { AppError } from '@src/lib/errors/AppError.js';
import { requestContext } from '@src/lib/request/requestContext.js';
import { ERROR_CODES } from '@chatxiv/cdm';
import type pino from 'pino';

function createMockLogger(): pino.Logger {
  return { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } as unknown as pino.Logger;
}

/** Minimal concrete client for exercising `RetryingHttpClient.fetchJson`. */
function createTestHttpClient(config: RetryingHttpClientConfig): RetryingHttpClient {
  return new (class extends RetryingHttpClient {
    constructor(c: RetryingHttpClientConfig) {
      super(c);
    }
  })(config);
}

const defaultOptions: RetryingHttpClientConfig = {
  timeoutMs: 5_000,
  sourceName: 'TestAPI',
};

describe('RetryingHttpClient', () => {
  const fetchMock = vi.fn();
  let log: pino.Logger;

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    log = createMockLogger();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function okJson(body: unknown): Partial<Response> {
    return { ok: true, status: 200, json: () => Promise.resolve(body) } as Partial<Response>;
  }

  function errorResponse(status: number, retryAfter?: string): Partial<Response> {
    const headers = new Headers();
    if (retryAfter) headers.set('Retry-After', retryAfter);
    return {
      ok: false,
      status,
      headers,
      json: () => Promise.resolve({ code: status, message: 'error' }),
    } as Partial<Response>;
  }

  function expectSourceUnavailable(err: unknown): void {
    expect(err).toBeInstanceOf(AppError);
    const appErr = err as AppError;
    expect(appErr.status).toBe(503);
    expect(appErr.code).toBe(ERROR_CODES.SOURCE_UNAVAILABLE);
  }

  // ── Success ───────────────────────────────────────────────────────

  describe('success', () => {
    it('returns parsed JSON on 200', async () => {
      fetchMock.mockResolvedValue(okJson({ id: 1 }));

      const result = await createTestHttpClient(defaultOptions).fetchJson(
        'https://api.example.com/data',
        log
      );

      expect(result).toEqual({ id: 1 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('returns blob on 200 from fetchBlob', async () => {
      const blob = new Blob(['x']);
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        blob: () => Promise.resolve(blob),
      } as Partial<Response>);

      const result = await createTestHttpClient(defaultOptions).fetchBlob(
        'https://api.example.com/asset',
        log
      );

      expect(result).toBe(blob);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  // ── custom headers ─────────────────────────────────────────────────

  describe('headers', () => {
    it('sends configured headers on every request, including retries', async () => {
      fetchMock.mockResolvedValueOnce(errorResponse(503)).mockResolvedValueOnce(okJson({ id: 1 }));

      const opts: RetryingHttpClientConfig = {
        ...defaultOptions,
        backoffBaseMs: 0,
        headers: { 'User-Agent': 'TestAPI/1.0 (test@example.com)' },
      };

      await createTestHttpClient(opts).fetchJson('https://api.example.com/data', log);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      for (const call of fetchMock.mock.calls) {
        const init = call[1] as RequestInit;
        expect((init.headers as Record<string, string>)['User-Agent']).toBe(
          'TestAPI/1.0 (test@example.com)'
        );
      }
    });

    it('omits the headers option entirely when not configured', async () => {
      fetchMock.mockResolvedValue(okJson({ id: 1 }));

      await createTestHttpClient(defaultOptions).fetchJson('https://api.example.com/data', log);

      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect(init.headers).toBeUndefined();
    });
  });

  // ── beforeAttempt hook ────────────────────────────────────────────

  describe('beforeAttempt', () => {
    it('calls beforeAttempt before each fetch', async () => {
      const order: string[] = [];
      const opts: RetryingHttpClientConfig = {
        ...defaultOptions,
        beforeAttempt: vi.fn().mockImplementation((ctx) => {
          order.push(`hook:${ctx.url}`);
          return Promise.resolve();
        }),
      };
      fetchMock.mockImplementation(() => {
        order.push('fetch');
        return Promise.resolve(okJson({ ok: true }));
      });

      await createTestHttpClient(opts).fetchJson('https://api.example.com/data', log);

      expect(order).toEqual(['hook:https://api.example.com/data', 'fetch']);
    });

    it('passes requestId from requestContext when present', async () => {
      const hook = vi.fn().mockResolvedValue(undefined);
      const opts: RetryingHttpClientConfig = {
        ...defaultOptions,
        beforeAttempt: hook,
      };
      fetchMock.mockResolvedValue(okJson({ ok: true }));

      await requestContext.run({ requestId: 'incoming-req-99' }, () =>
        createTestHttpClient(opts).fetchJson('https://api.example.com/data', log)
      );

      expect(hook).toHaveBeenCalledWith({
        url: 'https://api.example.com/data',
        requestId: 'incoming-req-99',
      });
    });
  });

  // ── Timeout ───────────────────────────────────────────────────────

  describe('timeout', () => {
    it('throws AppError.sourceUnavailable on TimeoutError', async () => {
      fetchMock.mockRejectedValue(new DOMException('signal timed out', 'TimeoutError'));

      try {
        await createTestHttpClient(defaultOptions).fetchJson('https://api.example.com/data', log);
        expect.unreachable('should have thrown');
      } catch (err) {
        expectSourceUnavailable(err);
        expect((err as AppError).message).toMatch(/timed out/);
        expect((err as AppError).message).toContain('TestAPI');
      }
    });

    it('throws AppError.sourceUnavailable on AbortError', async () => {
      const abort = new Error('aborted');
      abort.name = 'AbortError';
      fetchMock.mockRejectedValue(abort);

      try {
        await createTestHttpClient(defaultOptions).fetchJson('https://api.example.com/data', log);
        expect.unreachable('should have thrown');
      } catch (err) {
        expectSourceUnavailable(err);
        expect((err as AppError).message).toMatch(/timed out/);
      }
    });

    it('throws AppError.sourceUnavailable on generic network error', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));

      try {
        await createTestHttpClient(defaultOptions).fetchJson('https://api.example.com/data', log);
        expect.unreachable('should have thrown');
      } catch (err) {
        expectSourceUnavailable(err);
        expect((err as AppError).message).toBe('fetch failed');
      }
    });

    it('uses sourceName in fallback network error message', async () => {
      fetchMock.mockRejectedValue('non-error throw');

      try {
        await createTestHttpClient(defaultOptions).fetchJson('https://api.example.com/data', log);
        expect.unreachable('should have thrown');
      } catch (err) {
        expectSourceUnavailable(err);
        expect((err as AppError).message).toBe('TestAPI network error');
      }
    });

    it('combines a caller-provided signal with the per-attempt timeout so an external abort actually cancels the in-flight fetch', async () => {
      const controller = new AbortController();
      let capturedSignal: AbortSignal | undefined;
      fetchMock.mockImplementation((_url: string, init: RequestInit) => {
        capturedSignal = init.signal as AbortSignal;
        return new Promise((_resolve, reject) => {
          capturedSignal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      const promise = createTestHttpClient(defaultOptions).fetchJson(
        'https://api.example.com/data',
        log,
        controller.signal
      );

      controller.abort();

      await expect(promise).rejects.toBeInstanceOf(AppError);
      expect(capturedSignal?.aborted).toBe(true);
    });

    it('attributes a caller-cancelled request to cancellation, not a misleading "timed out" message', async () => {
      const controller = new AbortController();
      fetchMock.mockImplementation((_url: string, init: RequestInit) => {
        const signal = init.signal as AbortSignal;
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      const promise = createTestHttpClient(defaultOptions).fetchJson(
        'https://api.example.com/data',
        log,
        controller.signal
      );

      controller.abort();

      try {
        await promise;
        expect.unreachable('should have thrown');
      } catch (err) {
        expectSourceUnavailable(err);
        // The per-attempt timeout (defaultOptions.timeoutMs) never actually elapsed here --
        // only the caller's own signal fired. Asserting the message doesn't blame the attempt's
        // own budget for what was really an external cancellation.
        expect((err as AppError).message).not.toMatch(/timed out/);
        expect((err as AppError).message).toMatch(/cancelled/);
      }
    });
  });

  // ── Retry on 429 / 5xx ────────────────────────────────────────────

  describe('retry', () => {
    it('retries on 429 with exponential backoff', async () => {
      vi.useFakeTimers();

      fetchMock.mockResolvedValueOnce(errorResponse(429)).mockResolvedValueOnce(okJson({ id: 1 }));

      const promise = createTestHttpClient(defaultOptions).fetchJson(
        'https://api.example.com/data',
        log
      );

      await vi.advanceTimersByTimeAsync(1_000);
      const result = await promise;

      expect(result).toEqual({ id: 1 });
      expect(fetchMock).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('respects Retry-After header on 429', async () => {
      vi.useFakeTimers();

      fetchMock
        .mockResolvedValueOnce(errorResponse(429, '3'))
        .mockResolvedValueOnce(okJson({ id: 1 }));

      const promise = createTestHttpClient(defaultOptions).fetchJson(
        'https://api.example.com/data',
        log
      );

      await vi.advanceTimersByTimeAsync(3_000);
      const result = await promise;

      expect(result).toEqual({ id: 1 });
      expect(fetchMock).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('retries on 5xx responses', async () => {
      vi.useFakeTimers();

      fetchMock
        .mockResolvedValueOnce(errorResponse(502))
        .mockResolvedValueOnce(errorResponse(503))
        .mockResolvedValueOnce(okJson({ id: 1 }));

      const promise = createTestHttpClient(defaultOptions).fetchJson(
        'https://api.example.com/data',
        log
      );

      await vi.advanceTimersByTimeAsync(1_000);
      await vi.advanceTimersByTimeAsync(2_000);
      const result = await promise;

      expect(result).toEqual({ id: 1 });
      expect(fetchMock).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });

    it('throws AppError after exhausting all retries', async () => {
      vi.useFakeTimers();

      fetchMock.mockResolvedValue(errorResponse(500));

      const promise = createTestHttpClient(defaultOptions).fetchJson(
        'https://api.example.com/data',
        log
      );
      promise.catch(() => {});

      await vi.advanceTimersByTimeAsync(7_000);

      try {
        await promise;
        expect.unreachable('should have thrown');
      } catch (err) {
        expectSourceUnavailable(err);
        expect((err as AppError).message).toMatch(/500/);
        expect((err as AppError).message).toMatch(/retries/);
        expect((err as AppError).message).toContain('TestAPI');
      }

      expect(fetchMock).toHaveBeenCalledTimes(4);

      vi.useRealTimers();
    });

    it('does not retry on non-retryable 4xx', async () => {
      fetchMock.mockResolvedValue(errorResponse(404));

      try {
        await createTestHttpClient(defaultOptions).fetchJson('https://api.example.com/data', log);
        expect.unreachable('should have thrown');
      } catch (err) {
        expectSourceUnavailable(err);
        expect((err as AppError).message).toMatch(/404/);
        expect((err as AppError).message).toContain('TestAPI');
      }

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('supports custom maxRetries and backoffBaseMs', async () => {
      vi.useFakeTimers();

      fetchMock.mockResolvedValueOnce(errorResponse(500)).mockResolvedValueOnce(okJson({ id: 1 }));

      const opts: RetryingHttpClientConfig = {
        ...defaultOptions,
        maxRetries: 1,
        backoffBaseMs: 500,
      };
      const promise = createTestHttpClient(opts).fetchJson('https://api.example.com/data', log);

      await vi.advanceTimersByTimeAsync(500);
      const result = await promise;

      expect(result).toEqual({ id: 1 });
      expect(fetchMock).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  // ── Logging ───────────────────────────────────────────────────────

  describe('logging', () => {
    it('logs a warning on retryable errors', async () => {
      vi.useFakeTimers();

      fetchMock.mockResolvedValueOnce(errorResponse(503)).mockResolvedValueOnce(okJson({ id: 1 }));

      const promise = createTestHttpClient(defaultOptions).fetchJson(
        'https://api.example.com/data',
        log
      );

      await vi.advanceTimersByTimeAsync(1_000);
      await promise;

      expect(log.warn).toHaveBeenCalledTimes(1);
      expect(log.warn).toHaveBeenCalledWith(
        expect.objectContaining({ status: 503, attempt: 0 }),
        expect.stringContaining('retryable')
      );

      vi.useRealTimers();
    });

    it('includes sourceName in log message', async () => {
      vi.useFakeTimers();

      fetchMock.mockResolvedValueOnce(errorResponse(429)).mockResolvedValueOnce(okJson({ id: 1 }));

      const promise = createTestHttpClient(defaultOptions).fetchJson(
        'https://api.example.com/data',
        log
      );

      await vi.advanceTimersByTimeAsync(1_000);
      await promise;

      expect(log.warn).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('TestAPI'));

      vi.useRealTimers();
    });
  });
});
