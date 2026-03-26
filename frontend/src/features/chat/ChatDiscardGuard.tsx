import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/AlertDialog';
import { DestructiveButton, OutlineButton } from '../../components/ui/Button';
import { useChatSession } from './ChatSessionContext';
import { useChatConversationContext } from './ChatConversationContext';

export type ChatDiscardGuardContextValue = {
  /** Starts a new chat, or opens a confirm dialog when the ephemeral thread is dirty. */
  readonly requestStartNewChat: () => void;
  /** For same-route home links: run default navigation when clean; otherwise block and confirm. */
  readonly onHomeNavigationClick: (event: MouseEvent<HTMLAnchorElement>) => void;
};

const ChatDiscardGuardContext = createContext<ChatDiscardGuardContextValue | null>(null);

export function ChatDiscardGuard({ children }: { readonly children: ReactNode }) {
  const { startNewChat } = useChatSession();
  const { isEphemeralDirty } = useChatConversationContext();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const runStartNewChat = useCallback(() => {
    startNewChat();
  }, [startNewChat]);

  const requestStartNewChat = useCallback(() => {
    if (!isEphemeralDirty) {
      runStartNewChat();
      return;
    }
    setConfirmOpen(true);
  }, [isEphemeralDirty, runStartNewChat]);

  const onHomeNavigationClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (!isEphemeralDirty) {
        runStartNewChat();
        return;
      }
      event.preventDefault();
      setConfirmOpen(true);
    },
    [isEphemeralDirty, runStartNewChat]
  );

  const handleConfirmDiscard = useCallback(() => {
    setConfirmOpen(false);
    runStartNewChat();
  }, [runStartNewChat]);

  useEffect(() => {
    if (!isEphemeralDirty && confirmOpen) {
      setConfirmOpen(false);
    }
  }, [confirmOpen, isEphemeralDirty]);

  useEffect(() => {
    if (!isEphemeralDirty) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isEphemeralDirty]);

  const value = useMemo(
    (): ChatDiscardGuardContextValue => ({
      requestStartNewChat,
      onHomeNavigationClick,
    }),
    [requestStartNewChat, onHomeNavigationClick]
  );

  return (
    <ChatDiscardGuardContext.Provider value={value}>
      {children}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              Your conversation isn&apos;t saved. Starting over will clear messages and anything in
              the composer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <OutlineButton type="button">Stay</OutlineButton>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <DestructiveButton type="button" onClick={handleConfirmDiscard}>
                Start new chat
              </DestructiveButton>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ChatDiscardGuardContext.Provider>
  );
}

export function useChatDiscardGuard(): ChatDiscardGuardContextValue {
  const ctx = useContext(ChatDiscardGuardContext);
  if (!ctx) {
    throw new Error('useChatDiscardGuard must be used within ChatDiscardGuard');
  }
  return ctx;
}
