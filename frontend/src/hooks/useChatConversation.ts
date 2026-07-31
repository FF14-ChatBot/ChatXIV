import { useCallback, useEffect, useRef, useState } from 'react';
import { ConversationRole } from '@chatxiv/cdm';
import type { Message } from '../types/chat';
import { CHAT_THREAD_GREETING } from '../features/chat/chatThreadGreeting';
import { ChatSessionLanding } from '../types/chatSession';
import type { ChatAssistantPort } from '../lib/chat/chatAssistantPort';
import { createChatxivChatAssistantPort } from '../lib/chat/chatxivChatAssistantPort';
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
    role: ConversationRole.Assistant,
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
    fallbackPortRef.current = createChatxivChatAssistantPort();
  }
  const assistantPort = assistantPortOption ?? fallbackPortRef.current;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const prevSessionGenerationRef = useRef<number | null>(null);
  // Read inside sendMessage instead of closing over `messages` directly, so sendMessage's own
  // identity stays stable across message updates -- otherwise any consumer with `sendMessage` in
  // an effect's dependency array (e.g. a "seed a message" effect) infinite-loops, since sending a
  // message changes `messages`, which would change `sendMessage`, which would re-run the effect.
  const messagesRef = useRef<Message[]>(messages);
  messagesRef.current = messages;

  const cancelPendingReply = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsSending(false);
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
        role: ConversationRole.User,
      };

      // Prior turns only -- read before `setMessages` below commits, so the new user message is
      // correctly excluded.
      const historySnapshot = messagesRef.current;

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      cancelPendingReply();

      const ac = new AbortController();
      abortRef.current = ac;
      setIsSending(true);

      void (async () => {
        try {
          const reply = await assistantPort.getReply(trimmed, historySnapshot, ac.signal);
          if (abortRef.current !== ac) return;
          const botMessage: Message = {
            id: crypto.randomUUID(),
            text: reply.text,
            role: ConversationRole.Assistant,
            sources: reply.sources,
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
            setIsSending(false);
          }
        }
      })();
    },
    [assistantPort, cancelPendingReply]
  );

  return {
    messages,
    inputValue,
    isSending,
    setInputValue,
    sendMessage,
  };
}
