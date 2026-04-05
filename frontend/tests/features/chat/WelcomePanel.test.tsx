import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { WelcomePanel } from '@/features/chat/WelcomePanel';

describe('WelcomePanel', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    const onPromptSubmit = vi.fn();
    render(<WelcomePanel onPromptSubmit={onPromptSubmit} />);
    expect(screen.getByRole('button', { name: /where am i in the msq/i })).toBeInTheDocument();
  });

  it('submits a prompt when a suggestion is clicked', () => {
    const onPromptSubmit = vi.fn();
    render(<WelcomePanel onPromptSubmit={onPromptSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /where am i in the msq/i }));
    expect(onPromptSubmit).toHaveBeenCalledWith('Where am I in the MSQ?');
  });

  it('exposes carousel navigation when multiple slides exist', () => {
    const onPromptSubmit = vi.fn();
    render(<WelcomePanel onPromptSubmit={onPromptSubmit} />);
    expect(screen.getByRole('tab', { name: /set 1/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /set 2/i }));
    expect(screen.getByRole('button', { name: /monk's rotation/i })).toBeInTheDocument();
  });

  it('advances carousel slides on the interval when multiple slides exist', async () => {
    vi.useFakeTimers();
    render(<WelcomePanel onPromptSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: /where am i in the msq/i })).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(screen.getByRole('button', { name: /monk's rotation/i })).toBeInTheDocument();
  });
});

describe('WelcomePanel matchMedia', () => {
  type MediaListener = (e: { matches: boolean }) => void;
  let matches: boolean;
  let listeners: MediaListener[];

  beforeEach(() => {
    matches = true;
    listeners = [];
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => {
        expect(query).toBe('(max-width: 767px)');
        return {
          get matches() {
            return matches;
          },
          media: query,
          addEventListener: (_event: string, cb: MediaListener) => {
            listeners.push(cb);
          },
          removeEventListener: vi.fn(),
        };
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('subscribes to matchMedia changes for one-card layout', () => {
    render(<WelcomePanel onPromptSubmit={vi.fn()} />);
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
    expect(listeners.length).toBeGreaterThan(0);
  });
});
