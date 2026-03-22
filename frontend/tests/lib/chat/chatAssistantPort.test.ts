import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDemoChatAssistantPort, DEMO_ASSISTANT_REPLY } from '@/lib/chat/chatAssistantPort';

describe('createDemoChatAssistantPort', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with the demo reply after the delay', async () => {
    const port = createDemoChatAssistantPort(500);
    const p = port.getReply('hello');
    await vi.advanceTimersByTimeAsync(500);
    await expect(p).resolves.toEqual({ text: DEMO_ASSISTANT_REPLY });
  });

  it('rejects with AbortError when the signal is aborted before the delay', async () => {
    const port = createDemoChatAssistantPort(1000);
    const ac = new AbortController();
    const p = port.getReply('x', ac.signal);
    ac.abort();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const port = createDemoChatAssistantPort(1000);
    const ac = new AbortController();
    ac.abort();
    const p = port.getReply('x', ac.signal);
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects with AbortError when aborted while pending', async () => {
    const port = createDemoChatAssistantPort(1000);
    const ac = new AbortController();
    const p = port.getReply('x', ac.signal);
    await vi.advanceTimersByTimeAsync(100);
    ac.abort();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });
});
