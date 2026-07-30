import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CHAT_PATH } from '@chatxiv/cdm';
import { setChatxivApiClient } from '@/clients/chatxivApi/instance';
import { createChatxivApiClient } from '@/clients/chatxivApi/client';
import { sendChatMessage } from '@/clients/chatxivApi/chat';

describe('sendChatMessage', () => {
  beforeEach(() => {
    setChatxivApiClient(createChatxivApiClient());
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POSTs /v1/chat with the request body', async () => {
    const response = { messageId: 'm1', answer: 'Here you go.', sources: [] };
    const jsonMock = vi.fn().mockResolvedValue(response);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: jsonMock,
    });
    vi.stubGlobal('fetch', fetchMock);

    const body = { message: 'how do I unlock the Gold Saucer', conversationHistory: [] };
    const result = await sendChatMessage(body, { config: { baseUrl: 'http://localhost:3000' } });

    expect(result).toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:3000${CHAT_PATH}`,
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(body),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Request-Id': 'test-uuid',
        }),
      })
    );
  });

  it('forwards an AbortSignal', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: vi.fn().mockResolvedValue({ messageId: 'm', answer: 'a', sources: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const ac = new AbortController();
    await sendChatMessage(
      { message: 'q' },
      { config: { baseUrl: 'http://localhost:3000' }, signal: ac.signal }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: ac.signal })
    );
  });
});
