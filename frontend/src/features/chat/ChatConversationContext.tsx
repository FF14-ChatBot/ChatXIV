import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useChatSession } from './ChatSessionContext';
import { useChatConversation } from '../../hooks/useChatConversation';
import type { Message } from '../../types/chat';

export type ChatConversationContextValue = {
  readonly messages: Message[];
  readonly inputValue: string;
  readonly setInputValue: (value: string) => void;
  readonly sendMessage: (text: string) => void;
  /**
   * True when leaving or starting a new chat would discard visible state (thread or composer).
   * When server-backed saved chats exist, extend this to include “unsaved edits since last save”.
   */
  readonly isEphemeralDirty: boolean;
};

const ChatConversationContext = createContext<ChatConversationContextValue | null>(null);

export function ChatConversationProvider({ children }: { readonly children: ReactNode }) {
  const { sessionGeneration } = useChatSession();
  const { messages, inputValue, setInputValue, sendMessage } =
    useChatConversation(sessionGeneration);

  const isEphemeralDirty = messages.length > 0 || inputValue.trim().length > 0;

  const value = useMemo(
    (): ChatConversationContextValue => ({
      messages,
      inputValue,
      setInputValue,
      sendMessage,
      isEphemeralDirty,
    }),
    [messages, inputValue, setInputValue, sendMessage, isEphemeralDirty]
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
