import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FEEDBACK_PATH } from '@chatxiv/cdm';
import { setChatxivApiClient } from '@/clients/chatxivApi/instance';
import { createChatxivApiClient } from '@/clients/chatxivApi/client';
import { submitFeedback } from '@/clients/chatxivApi/feedback';

describe('submitFeedback', () => {
  beforeEach(() => {
    setChatxivApiClient(createChatxivApiClient());
    vi.stubGlobal('crypto', { randomUUID: () => 'idempotency-uuid' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POSTs /v1/feedback with body and Idempotency-Key', async () => {
    const jsonMock = vi.fn().mockResolvedValue({ ok: true });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: jsonMock,
    });
    vi.stubGlobal('fetch', fetchMock);

    const body = {
      messageId: 'msg-1',
      rating: 'up' as const,
      reasonCode: 'other' as const,
    };

    const result = await submitFeedback(body, {
      config: { baseUrl: 'http://localhost:3000' },
    });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:3000${FEEDBACK_PATH}`,
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(body),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Idempotency-Key': 'idempotency-uuid',
        }),
      })
    );
  });

  it('uses explicit idempotency key when provided', async () => {
    const jsonMock = vi.fn().mockResolvedValue({ ok: true });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: jsonMock,
    });
    vi.stubGlobal('fetch', fetchMock);

    await submitFeedback(
      { messageId: 'm', rating: 'down', reasonCode: 'outdated' },
      { idempotencyKey: 'custom-key', config: { baseUrl: 'http://localhost:3000' } }
    );

    const call = fetchMock.mock.calls[0][1];
    expect(call.headers['Idempotency-Key']).toBe('custom-key');
  });

  it('accepts body only and defaults options to an empty object', async () => {
    const jsonMock = vi.fn().mockResolvedValue({ ok: true });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: jsonMock,
    });
    vi.stubGlobal('fetch', fetchMock);

    await submitFeedback({
      messageId: 'm',
      rating: 'up',
      reasonCode: 'other',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/v1\/feedback$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Idempotency-Key': 'idempotency-uuid',
        }),
      })
    );
  });

  it('falls back when crypto.randomUUID is unavailable', async () => {
    vi.stubGlobal('crypto', {});
    const jsonMock = vi.fn().mockResolvedValue({ ok: true });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: jsonMock,
    });
    vi.stubGlobal('fetch', fetchMock);

    await submitFeedback(
      { messageId: 'm', rating: 'up', reasonCode: 'other' },
      { config: { baseUrl: 'http://localhost:3000' } }
    );

    const call = fetchMock.mock.calls[0][1];
    expect(call.headers['Idempotency-Key']).toMatch(/^idemp-\d+-[a-z0-9]+$/);
  });
});
