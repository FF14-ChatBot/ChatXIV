import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageRole, type Message } from '../types/chat';
import { CHAT_THREAD_GREETING } from '../features/chat/chatThreadGreeting';
import { ChatSessionLanding } from '../types/chatSession';
import { createDemoChatAssistantPort, type ChatAssistantPort } from '../lib/chat/chatAssistantPort';
import { logger } from '../lib/logger/instance';

export type UseChatConversationOptions = {
  /** Injected assistant (tests); defaults to a demo delayed reply. */
  assistantPort?: ChatAssistantPort;
  /** Landing for the current session after each generation bump (from {@link useChatSession}). */
  sessionLanding?: ChatSessionLanding;
};

/**
 * Message list + composer state, reset on `sessionGeneration`, and send pipeline via
 * {@link ChatAssistantPort}.
 */
function makeThreadGreetingMessage(): Message {
  return {
    id: crypto.randomUUID(),
    text: CHAT_THREAD_GREETING,
    role: MessageRole.Assistant,
  };
}

export function useChatConversation(
  sessionGeneration: number,
  options: UseChatConversationOptions = {}
) {
  const { assistantPort: assistantPortOption, sessionLanding = ChatSessionLanding.Welcome } =
    options;
  const fallbackPortRef = useRef<ChatAssistantPort | null>(null);
  if (fallbackPortRef.current === null) {
    fallbackPortRef.current = createDemoChatAssistantPort();
  }
  const assistantPort = assistantPortOption ?? fallbackPortRef.current;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const prevSessionGenerationRef = useRef<number | null>(null);

  const cancelPendingReply = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => {
    if (prevSessionGenerationRef.current === null) {
      prevSessionGenerationRef.current = sessionGeneration;
      return;
    }
    if (prevSessionGenerationRef.current === sessionGeneration) {
      return;
    }
    prevSessionGenerationRef.current = sessionGeneration;
    cancelPendingReply();
    setInputValue('');
    setMessages(sessionLanding === ChatSessionLanding.Thread ? [makeThreadGreetingMessage()] : []);
  }, [sessionGeneration, sessionLanding, cancelPendingReply]);

  useEffect(() => () => cancelPendingReply(), [cancelPendingReply]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        text: trimmed,
        role: MessageRole.User,
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
            role: MessageRole.Assistant,
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
