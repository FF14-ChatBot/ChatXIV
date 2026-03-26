import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ChatSessionLanding } from '../../types/chatSession';

export type { ChatSessionLanding };

/**
 * Chat session boundary: incrementing generation lets the chat UI reset without lifting
 * all message state into the layout. Later, swap `startNewChat` to also call an API
 * with a new server-side session id.
 */
type ChatSessionContextValue = {
  readonly sessionGeneration: number;
  readonly landing: ChatSessionLanding;
  readonly startNewChat: (options?: { readonly landing?: ChatSessionLanding }) => void;
};

const ChatSessionContext = createContext<ChatSessionContextValue | null>(null);

export function ChatSessionProvider({ children }: { readonly children: ReactNode }) {
  const [sessionGeneration, setSessionGeneration] = useState(0);
  const [landing, setLanding] = useState<ChatSessionLanding>('welcome');

  const startNewChat = useCallback((options?: { readonly landing?: ChatSessionLanding }) => {
    const nextLanding = options?.landing ?? 'welcome';
    setLanding(nextLanding);
    setSessionGeneration((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({ sessionGeneration, landing, startNewChat }),
    [sessionGeneration, landing, startNewChat]
  );

  return <ChatSessionContext.Provider value={value}>{children}</ChatSessionContext.Provider>;
}

export function useChatSession(): ChatSessionContextValue {
  const ctx = useContext(ChatSessionContext);
  if (!ctx) {
    throw new Error('useChatSession must be used within ChatSessionProvider');
  }
  return ctx;
}
