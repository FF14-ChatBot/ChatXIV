import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GlobalErrorHandler } from '@/components/GlobalErrorHandler';

/** jsdom does not define `PromiseRejectionEvent`; the handler only needs `reason` and `preventDefault`. */
function createUnhandledRejectionEvent(reason: unknown): Event {
  const promise = Promise.resolve();
  if (typeof PromiseRejectionEvent !== 'undefined') {
    return new PromiseRejectionEvent('unhandledrejection', { promise, reason });
  }
  const evt = new Event('unhandledrejection', { cancelable: true });
  Object.defineProperty(evt, 'promise', { value: promise });
  Object.defineProperty(evt, 'reason', { value: reason });
  return evt;
}

describe('GlobalErrorHandler', () => {
  it('does not replace the tree when a script resource error bubbles to window', () => {
    render(
      <GlobalErrorHandler>
        <span>Child</span>
      </GlobalErrorHandler>
    );

    const script = document.createElement('script');
    const evt = new ErrorEvent('error', { bubbles: true });
    Object.defineProperty(evt, 'target', { value: script, configurable: true });

    act(() => {
      window.dispatchEvent(evt);
    });

    expect(screen.getByText('Child')).toBeInTheDocument();
    expect(screen.queryByText(/Something went wrong/)).not.toBeInTheDocument();
  });

  it('replaces the tree for a window-level runtime error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <GlobalErrorHandler>
        <span>Child</span>
      </GlobalErrorHandler>
    );

    const evt = new ErrorEvent('error', {
      error: new Error('boom'),
      message: 'boom',
      bubbles: true,
    });
    act(() => {
      window.dispatchEvent(evt);
    });

    expect(screen.queryByText('Child')).not.toBeInTheDocument();
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();

    spy.mockRestore();
  });

  it('ignores ERR_BLOCKED_BY_CLIENT window errors', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <GlobalErrorHandler>
        <span>Child</span>
      </GlobalErrorHandler>
    );

    const evt = new ErrorEvent('error', {
      message: 'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT',
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(evt);
    });

    expect(screen.getByText('Child')).toBeInTheDocument();
    expect(screen.queryByText(/Something went wrong/)).not.toBeInTheDocument();

    spy.mockRestore();
  });

  it('ignores unhandled rejections whose message includes ERR_BLOCKED_BY_CLIENT', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <GlobalErrorHandler>
        <span>Child</span>
      </GlobalErrorHandler>
    );

    const evt = createUnhandledRejectionEvent(new Error('net::ERR_BLOCKED_BY_CLIENT'));

    act(() => {
      window.dispatchEvent(evt);
    });

    expect(screen.getByText('Child')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('shows the fallback UI for unhandled rejections', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <GlobalErrorHandler>
        <span>Child</span>
      </GlobalErrorHandler>
    );

    const evt = createUnhandledRejectionEvent(new Error('async boom'));

    act(() => {
      window.dispatchEvent(evt);
    });

    expect(screen.queryByText('Child')).not.toBeInTheDocument();
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    spy.mockRestore();
  });

  it('handles string unhandled rejection reasons', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <GlobalErrorHandler>
        <span>Child</span>
      </GlobalErrorHandler>
    );

    const evt = createUnhandledRejectionEvent('string failure');

    act(() => {
      window.dispatchEvent(evt);
    });

    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    spy.mockRestore();
  });

  it('wraps non-Error unhandled rejection reasons', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <GlobalErrorHandler>
        <span>Child</span>
      </GlobalErrorHandler>
    );

    const evt = createUnhandledRejectionEvent(503);

    act(() => {
      window.dispatchEvent(evt);
    });

    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    spy.mockRestore();
  });

  it('uses the error message when window.error has no error object', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <GlobalErrorHandler>
        <span>Child</span>
      </GlobalErrorHandler>
    );

    const evt = new ErrorEvent('error', {
      message: 'no error property',
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(evt);
    });

    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    spy.mockRestore();
  });

  it('clears the fallback when Try again is clicked', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <GlobalErrorHandler>
        <span>Child</span>
      </GlobalErrorHandler>
    );

    act(() => {
      window.dispatchEvent(
        new ErrorEvent('error', {
          error: new Error('boom'),
          message: 'boom',
          bubbles: true,
        })
      );
    });

    expect(screen.queryByText('Child')).not.toBeInTheDocument();

    act(() => {
      screen.getByRole('button', { name: /try again/i }).click();
    });

    expect(screen.getByText('Child')).toBeInTheDocument();
    spy.mockRestore();
  });
});
