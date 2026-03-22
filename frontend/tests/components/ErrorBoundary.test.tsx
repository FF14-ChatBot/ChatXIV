import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const Throw = () => {
  throw new Error('test error');
};

describe('ErrorBoundary', () => {
  function suppressConsoleError() {
    return vi.spyOn(console, 'error').mockImplementation(() => {});
  }

  /** jsdom still prints "Uncaught" stacks to stderr unless the error event is marked handled */
  function suppressWindowErrorForNextThrow() {
    const handler = (event: ErrorEvent) => {
      event.preventDefault();
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <span>Child content</span>
      </ErrorBoundary>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders fallback when child throws', () => {
    const spy = suppressConsoleError();
    const offWindowError = suppressWindowErrorForNextThrow();
    try {
      render(
        <ErrorBoundary fallback={<div>Custom fallback</div>}>
          <Throw />
        </ErrorBoundary>
      );
      expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    } finally {
      offWindowError();
      spy.mockRestore();
    }
  });

  it('renders default fallback when no fallback prop', () => {
    const spy = suppressConsoleError();
    const offWindowError = suppressWindowErrorForNextThrow();
    try {
      render(
        <ErrorBoundary>
          <Throw />
        </ErrorBoundary>
      );
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    } finally {
      offWindowError();
      spy.mockRestore();
    }
  });
});
