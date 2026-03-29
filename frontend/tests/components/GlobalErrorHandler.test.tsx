import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GlobalErrorHandler } from '@/components/GlobalErrorHandler';

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
});
