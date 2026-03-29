import { useEffect, useState, type ReactNode } from 'react';
import { isResourceLoadErrorEvent } from '../lib/errors/isResourceLoadErrorEvent';

interface Props {
  children: ReactNode;
}

/** Catches unhandled promise rejections and window errors (async/event handlers); ErrorBoundary catches render errors. */
export function GlobalErrorHandler({ children }: Props): ReactNode {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    function isBlockedByClientMessage(message: string): boolean {
      return message.includes('ERR_BLOCKED_BY_CLIENT');
    }

    function onUnhandledRejection(e: PromiseRejectionEvent): void {
      e.preventDefault();
      const reasonMessage =
        e.reason instanceof Error ? e.reason.message : typeof e.reason === 'string' ? e.reason : '';
      if (isBlockedByClientMessage(reasonMessage)) {
        return;
      }
      const err = e.reason instanceof Error ? e.reason : new Error(String(e.reason));
      console.error('Unhandled rejection:', err);
      setError(err);
    }

    function onError(e: ErrorEvent): void {
      if (isResourceLoadErrorEvent(e)) {
        return;
      }
      if (isBlockedByClientMessage(e.message)) {
        return;
      }
      const err = e.error instanceof Error ? e.error : new Error(e.message);
      console.error('Uncaught error:', err);
      setError(err);
    }

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('error', onError);
    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('error', onError);
    };
  }, []);

  if (error) {
    return (
      <div role="alert" style={{ padding: '1rem', textAlign: 'center' }}>
        <p>Something went wrong. Please refresh the page.</p>
        <button type="button" onClick={() => setError(null)}>
          Try again
        </button>
      </div>
    );
  }

  return children;
}
