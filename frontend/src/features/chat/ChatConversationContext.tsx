import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useChatSession } from './ChatSessionContext';
import { useChatConversation } from '../../hooks/useChatConversation';
import { ConversationRole } from '@chatxiv/cdm';
import type { Message } from '../../types/chat';

export type ChatConversationContextValue = {
  readonly messages: Message[];
  readonly inputValue: string;
  readonly setInputValue: (value: string) => void;
  readonly sendMessage: (text: string) => void;
  /** True while awaiting a reply to the most recent `sendMessage` call. */
  readonly isSending: boolean;
  /**
   * True when the user has typed or sent a message (assistant-only opener does not count).
   * When server-backed saved chats exist, extend this to include “unsaved edits since last save”.
   */
  readonly isEphemeralDirty: boolean;
};

const ChatConversationContext = createContext<ChatConversationContextValue | null>(null);

export function ChatConversationProvider({ children }: { readonly children: ReactNode }) {
  const { sessionGeneration, landing } = useChatSession();
  const { messages, inputValue, setInputValue, sendMessage, isSending } = useChatConversation(
    sessionGeneration,
    { sessionLanding: landing }
  );

  const isEphemeralDirty =
    messages.some((m) => m.role === ConversationRole.User) || inputValue.trim().length > 0;

  const value = useMemo(
    (): ChatConversationContextValue => ({
      messages,
      inputValue,
      setInputValue,
      sendMessage,
      isSending,
      isEphemeralDirty,
    }),
    [messages, inputValue, setInputValue, sendMessage, isSending, isEphemeralDirty]
  );

  return (
    <ChatConversationContext.Provider value={value}>{children}</ChatConversationContext.Provider>
  );
}

export function useChatConversationContext(): ChatConversationContextValue {
  const ctx = useContext(ChatConversationContext);
  if (!ctx) {
    throw new Error('useChatConversationContext must be used within ChatConversationProvider');
  }
  return ctx;
}
