import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setChatxivApiClient, chatxivApiRequest } from '@/clients/chatxivApi/instance';
import { createChatxivApiClient } from '@/clients/chatxivApi/client';
import { parseErrorBody } from '@/clients/chatxivApi/client';
import { ApiClientError } from '@/clients/chatxivApi/errors/ApiClientError';

describe('chatxivApiRequest', () => {
  beforeEach(() => {
    setChatxivApiClient(createChatxivApiClient());
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('merges custom headers with defaults', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await chatxivApiRequest('POST', '/v1/feedback', {
      config: { baseUrl: 'http://localhost:3000' },
      headers: { 'Idempotency-Key': 'k-1' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/v1/feedback',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Idempotency-Key': 'k-1',
          'X-Request-Id': 'test-uuid',
        }),
      })
    );
  });

  it('adds X-Request-Id and optional X-Session-Id to headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await chatxivApiRequest('GET', '/health', {
      config: { baseUrl: 'http://localhost:3000', getSessionId: () => 'sess-1' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/health',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Request-Id': 'test-uuid',
          'X-Session-Id': 'sess-1',
        }),
      })
    );
  });

  it('returns parsed JSON on 200', async () => {
    const data = { status: 'ok' };
    const jsonMock = vi.fn().mockResolvedValue(data);
    vi.stubGlobal('fetch', () =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: jsonMock,
      })
    );

    const result = await chatxivApiRequest<{ status: string }>('GET', '/health');
    expect(result).toEqual(data);
    expect(jsonMock).toHaveBeenCalledTimes(1);
  });

  it('throws ApiClientError with mapped message on 4xx', async () => {
    const errorBody = {
      code: 'RATE_LIMITED',
      message: 'Too many requests',
      requestId: 'req-1',
    };
    const jsonMock = vi.fn().mockResolvedValue(errorBody);
    vi.stubGlobal('fetch', () =>
      Promise.resolve({
        ok: false,
        status: 429,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: jsonMock,
      })
    );

    await expect(chatxivApiRequest('POST', '/v1/chat', { body: {} })).rejects.toThrow(
      ApiClientError
    );
    try {
      await chatxivApiRequest('POST', '/v1/chat', { body: {} });
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      const e = err as ApiClientError;
      expect(e.code).toBe('RATE_LIMITED');
      expect(e.displayMessage).toBe("You've reached the limit for now; please try again later.");
      expect(e.requestId).toBe('req-1');
      expect(e.status).toBe(429);
      expect(e.body).toEqual(errorBody);
    }
    expect(jsonMock).toHaveBeenCalledTimes(2);
  });

  it('throws ApiClientError with fallback message on network failure', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('Network error')));

    await expect(chatxivApiRequest('GET', '/health')).rejects.toThrow(ApiClientError);
    try {
      await chatxivApiRequest('GET', '/health');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      const e = err as ApiClientError;
      expect(e.code).toBe('INTERNAL_ERROR');
      expect(e.displayMessage).toBe('Something went wrong. Please try again.');
    }
  });

  it('rethrows AbortError as-is instead of wrapping it in ApiClientError', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new DOMException('Aborted', 'AbortError')));

    const ac = new AbortController();
    await expect(
      chatxivApiRequest('POST', '/v1/chat', { body: {}, signal: ac.signal })
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('throws ApiClientError with INTERNAL_ERROR when 4xx body is not valid JSON', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({
        ok: false,
        status: 400,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: () => Promise.reject(new Error('parse error')),
      })
    );

    await expect(chatxivApiRequest('POST', '/v1/chat', { body: {} })).rejects.toThrow(
      ApiClientError
    );
    try {
      await chatxivApiRequest('POST', '/v1/chat', { body: {} });
    } catch (err) {
      const e = err as ApiClientError;
      expect(e.code).toBe('INTERNAL_ERROR');
    }
  });

  it('returns undefined for 200 with non-JSON body', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'text/plain' }),
        json: () => Promise.reject(new Error('not json')),
      })
    );

    const result = await chatxivApiRequest('GET', '/health');
    expect(result).toBeUndefined();
  });

  it('returns undefined for 204 No Content', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({
        ok: true,
        status: 204,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      })
    );

    const result = await chatxivApiRequest('DELETE', '/v1/item');
    expect(result).toBeUndefined();
  });

  it('returns undefined for 201 with non-JSON Content-Type without reading body', async () => {
    const json = vi.fn();
    vi.stubGlobal('fetch', () =>
      Promise.resolve({
        ok: true,
        status: 201,
        headers: new Headers({ 'Content-Type': 'text/html' }),
        json,
      })
    );

    const result = await chatxivApiRequest('POST', '/v1/item');
    expect(result).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it('uses fallback X-Request-Id when crypto.randomUUID is missing', async () => {
    vi.stubGlobal('crypto', {});
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await chatxivApiRequest('GET', '/health', {
      config: { baseUrl: 'http://localhost:3000' },
    });

    const call = fetchMock.mock.calls[0][1];
    expect(call.headers['X-Request-Id']).toMatch(/^req-\d+-[a-z0-9]+$/);
  });
});

describe('parseErrorBody', () => {
  it('returns undefined when Content-Type is not JSON', async () => {
    const json = vi.fn();
    const res = {
      headers: new Headers({ 'Content-Type': 'text/plain' }),
      json,
    } as unknown as Response;
    const result = await parseErrorBody(res);
    expect(result).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it('returns undefined when Content-Type header is missing', async () => {
    const json = vi.fn();
    const res = {
      headers: new Headers(),
      json,
    } as unknown as Response;
    const result = await parseErrorBody(res);
    expect(result).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it('returns parsed body when Content-Type is application/json and json() resolves', async () => {
    const body = { code: 'VALIDATION_ERROR', message: 'Bad input' };
    const res = {
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () => Promise.resolve(body),
    } as unknown as Response;
    const result = await parseErrorBody(res);
    expect(result).toEqual(body);
  });

  it('returns undefined when Content-Type is application/json but json() rejects', async () => {
    const res = {
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () => Promise.reject(new Error('parse failed')),
    } as unknown as Response;
    const result = await parseErrorBody(res);
    expect(result).toBeUndefined();
  });
});

describe('ChatXIV API client DI', () => {
  it('getChatxivApiClient throws when setChatxivApiClient was not called', async () => {
    vi.resetModules();
    const { getChatxivApiClient } = await import('@/clients/chatxivApi/instance.js');
    expect(() => getChatxivApiClient()).toThrow('ChatXIV API client not initialized');
  });
});
