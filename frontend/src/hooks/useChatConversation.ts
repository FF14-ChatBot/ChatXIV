import { useCallback, useEffect, useRef, useState } from 'react';
import type { Message } from '../types/chat';
import { createDemoChatAssistantPort, type ChatAssistantPort } from '../lib/chat/chatAssistantPort';
import { logger } from '../lib/logger/instance';

export type UseChatConversationOptions = {
  /** Injected assistant (tests); defaults to a demo delayed reply. */
  assistantPort?: ChatAssistantPort;
};

/**
 * Message list + composer state, reset on `sessionGeneration`, and send pipeline via
 * {@link ChatAssistantPort}.
 */
export function useChatConversation(
  sessionGeneration: number,
  options: UseChatConversationOptions = {}
) {
  const { assistantPort: assistantPortOption } = options;
  const fallbackPortRef = useRef<ChatAssistantPort | null>(null);
  if (fallbackPortRef.current === null) {
    fallbackPortRef.current = createDemoChatAssistantPort();
  }
  const assistantPort = assistantPortOption ?? fallbackPortRef.current;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const cancelPendingReply = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => {
    cancelPendingReply();
    setMessages([]);
    setInputValue('');
  }, [sessionGeneration, cancelPendingReply]);

  useEffect(() => () => cancelPendingReply(), [cancelPendingReply]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        text: trimmed,
        role: 'user',
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      cancelPendingReply();

      const ac = new AbortController();
      abortRef.current = ac;

      void (async () => {
        try {
          const { text: replyText } = await assistantPort.getReply(trimmed, ac.signal);
          if (abortRef.current !== ac) return;
          const botMessage: Message = {
            id: crypto.randomUUID(),
            text: replyText,
            role: 'assistant',
          };
          setMessages((prev) => [...prev, botMessage]);
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          logger.error('Chat assistant reply failed', {
            error: e instanceof Error ? e.message : String(e),
          });
        } finally {
          if (abortRef.current === ac) {
            abortRef.current = null;
          }
        }
      })();
    },
    [assistantPort, cancelPendingReply]
  );

  return {
    messages,
    inputValue,
    setInputValue,
    sendMessage,
  };
}
