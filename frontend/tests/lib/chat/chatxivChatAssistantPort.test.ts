import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationRole } from '@chatxiv/cdm';
import type { Message } from '@/types/chat';

const sendChatMessageMock = vi.fn();
vi.mock('@/clients/chatxivApi/chat', () => ({
  sendChatMessage: (...args: unknown[]) => sendChatMessageMock(...args),
}));

const { createChatxivChatAssistantPort } = await import('@/lib/chat/chatxivChatAssistantPort');

describe('createChatxivChatAssistantPort', () => {
  beforeEach(() => {
    sendChatMessageMock.mockReset();
  });

  it('sends the message with mapped conversation history and returns the answer/sources', async () => {
    sendChatMessageMock.mockResolvedValue({
      messageId: 'm1',
      answer: 'Here you go.',
      sources: [{ sourceName: 'Wiki' }],
    });

    const history: Message[] = [
      { id: '1', text: 'earlier question', role: ConversationRole.User },
      { id: '2', text: 'earlier answer', role: ConversationRole.Assistant },
    ];
    const port = createChatxivChatAssistantPort();
    const reply = await port.getReply('new question', history);

    expect(sendChatMessageMock).toHaveBeenCalledWith(
      {
        message: 'new question',
        conversationHistory: [
          { role: ConversationRole.User, content: 'earlier question' },
          { role: ConversationRole.Assistant, content: 'earlier answer' },
        ],
      },
      { signal: undefined }
    );
    expect(reply).toEqual({ text: 'Here you go.', sources: [{ sourceName: 'Wiki' }] });
  });

  it('maps an empty history to an empty conversationHistory array', async () => {
    sendChatMessageMock.mockResolvedValue({ messageId: 'm', answer: 'a', sources: [] });
    const port = createChatxivChatAssistantPort();

    await port.getReply('q', []);

    expect(sendChatMessageMock).toHaveBeenCalledWith(
      { message: 'q', conversationHistory: [] },
      { signal: undefined }
    );
  });

  it('forwards the AbortSignal', async () => {
    sendChatMessageMock.mockResolvedValue({ messageId: 'm', answer: 'a', sources: [] });
    const port = createChatxivChatAssistantPort();
    const ac = new AbortController();

    await port.getReply('q', [], ac.signal);

    expect(sendChatMessageMock).toHaveBeenCalledWith(expect.anything(), { signal: ac.signal });
  });

  it('propagates a rejection from sendChatMessage', async () => {
    sendChatMessageMock.mockRejectedValue(new Error('network error'));
    const port = createChatxivChatAssistantPort();

    await expect(port.getReply('q', [])).rejects.toThrow('network error');
  });
});
