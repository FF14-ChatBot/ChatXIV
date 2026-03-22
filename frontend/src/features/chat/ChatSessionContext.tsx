import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Chat session boundary: incrementing generation lets the chat UI reset without lifting
 * all message state into the layout. Later, swap `startNewChat` to also call an API
 * with a new server-side session id.
 */
type ChatSessionContextValue = {
  readonly sessionGeneration: number;
  readonly startNewChat: () => void;
};

const ChatSessionContext = createContext<ChatSessionContextValue | null>(null);

export function ChatSessionProvider({ children }: { readonly children: ReactNode }) {
  const [sessionGeneration, setSessionGeneration] = useState(0);

  const startNewChat = useCallback(() => {
    setSessionGeneration((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({ sessionGeneration, startNewChat }),
    [sessionGeneration, startNewChat]
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
