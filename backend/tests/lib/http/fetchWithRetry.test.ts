import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry, type FetchWithRetryOptions } from '@src/lib/http/fetchWithRetry.js';
import { AppError } from '@src/lib/errors/AppError.js';
import { ERROR_CODES } from '@chatxiv/cdm';
import type pino from 'pino';

function createMockLogger(): pino.Logger {
  return { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } as unknown as pino.Logger;
}

const defaultOptions: FetchWithRetryOptions = {
  timeoutMs: 5_000,
  sourceName: 'TestAPI',
};

describe('lib/http/fetchWithRetry', () => {
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

      const result = await fetchWithRetry('https://api.example.com/data', defaultOptions, log);

      expect(result).toEqual({ id: 1 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  // ── beforeAttempt hook ────────────────────────────────────────────

  describe('beforeAttempt', () => {
    it('calls beforeAttempt before each fetch', async () => {
      const order: string[] = [];
      const opts: FetchWithRetryOptions = {
        ...defaultOptions,
        beforeAttempt: vi.fn().mockImplementation(() => {
          order.push('hook');
          return Promise.resolve();
        }),
      };
      fetchMock.mockImplementation(() => {
        order.push('fetch');
        return Promise.resolve(okJson({ ok: true }));
      });

      await fetchWithRetry('https://api.example.com/data', opts, log);

      expect(order).toEqual(['hook', 'fetch']);
    });
  });

  // ── Timeout ───────────────────────────────────────────────────────

  describe('timeout', () => {
    it('throws AppError.sourceUnavailable on TimeoutError', async () => {
      fetchMock.mockRejectedValue(new DOMException('signal timed out', 'TimeoutError'));

      try {
        await fetchWithRetry('https://api.example.com/data', defaultOptions, log);
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
        await fetchWithRetry('https://api.example.com/data', defaultOptions, log);
        expect.unreachable('should have thrown');
      } catch (err) {
        expectSourceUnavailable(err);
        expect((err as AppError).message).toMatch(/timed out/);
      }
    });

    it('throws AppError.sourceUnavailable on generic network error', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));

      try {
        await fetchWithRetry('https://api.example.com/data', defaultOptions, log);
        expect.unreachable('should have thrown');
      } catch (err) {
        expectSourceUnavailable(err);
        expect((err as AppError).message).toBe('fetch failed');
      }
    });

    it('uses sourceName in fallback network error message', async () => {
      fetchMock.mockRejectedValue('non-error throw');

      try {
        await fetchWithRetry('https://api.example.com/data', defaultOptions, log);
        expect.unreachable('should have thrown');
      } catch (err) {
        expectSourceUnavailable(err);
        expect((err as AppError).message).toBe('TestAPI network error');
      }
    });
  });

  // ── Retry on 429 / 5xx ────────────────────────────────────────────

  describe('retry', () => {
    it('retries on 429 with exponential backoff', async () => {
      vi.useFakeTimers();

      fetchMock.mockResolvedValueOnce(errorResponse(429)).mockResolvedValueOnce(okJson({ id: 1 }));

      const promise = fetchWithRetry('https://api.example.com/data', defaultOptions, log);

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

      const promise = fetchWithRetry('https://api.example.com/data', defaultOptions, log);

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

      const promise = fetchWithRetry('https://api.example.com/data', defaultOptions, log);

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

      const promise = fetchWithRetry('https://api.example.com/data', defaultOptions, log);
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
        await fetchWithRetry('https://api.example.com/data', defaultOptions, log);
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

      const opts: FetchWithRetryOptions = {
        ...defaultOptions,
        maxRetries: 1,
        backoffBaseMs: 500,
      };
      const promise = fetchWithRetry('https://api.example.com/data', opts, log);

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

      const promise = fetchWithRetry('https://api.example.com/data', defaultOptions, log);

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

      const promise = fetchWithRetry('https://api.example.com/data', defaultOptions, log);

      await vi.advanceTimersByTimeAsync(1_000);
      await promise;

      expect(log.warn).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('TestAPI'));

      vi.useRealTimers();
    });
  });
});
