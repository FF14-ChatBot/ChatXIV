import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import type { ChatSessionLanding } from '../../types/chatSession';
import { useChatSession } from './ChatSessionContext';
import { useChatConversationContext } from './ChatConversationContext';

export type ChatDiscardGuardContextValue = {
  /** Starts a new chat, or opens a confirm dialog when the ephemeral thread is dirty. */
  readonly requestStartNewChat: () => void;
  /** Home / logo: reset to welcome and follow `to="/"` when the thread is clean. */
  readonly onHomeNavigationClick: (event: MouseEvent<HTMLAnchorElement>) => void;
};

const ChatDiscardGuardContext = createContext<ChatDiscardGuardContextValue | null>(null);

export function ChatDiscardGuard({ children }: { readonly children: ReactNode }) {
  const { startNewChat } = useChatSession();
  const { isEphemeralDirty } = useChatConversationContext();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingLandingOnDiscardRef = useRef<ChatSessionLanding | null>(null);

  const runStartNewChat = useCallback(
    (landing: ChatSessionLanding) => {
      startNewChat({ landing });
    },
    [startNewChat]
  );

  const requestStartNewChat = useCallback(() => {
    if (!isEphemeralDirty) {
      runStartNewChat('thread');
      return;
    }
    pendingLandingOnDiscardRef.current = 'thread';
    setConfirmOpen(true);
  }, [isEphemeralDirty, runStartNewChat]);

  const onHomeNavigationClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (!isEphemeralDirty) {
        runStartNewChat('welcome');
        return;
      }
      event.preventDefault();
      pendingLandingOnDiscardRef.current = 'welcome';
      setConfirmOpen(true);
    },
    [isEphemeralDirty, runStartNewChat]
  );

  const handleConfirmDiscard = useCallback(() => {
    const landing = pendingLandingOnDiscardRef.current ?? 'welcome';
    pendingLandingOnDiscardRef.current = null;
    setConfirmOpen(false);
    runStartNewChat(landing);
  }, [runStartNewChat]);

  const handleConfirmOpenChange = useCallback((open: boolean) => {
    setConfirmOpen(open);
    if (!open) {
      queueMicrotask(() => {
        pendingLandingOnDiscardRef.current = null;
      });
    }
  }, []);

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
      <AlertDialog open={confirmOpen} onOpenChange={handleConfirmOpenChange}>
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
              <OutlineButton
                type="button"
                onClick={() => {
                  pendingLandingOnDiscardRef.current = null;
                }}
              >
                Stay
              </OutlineButton>
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
