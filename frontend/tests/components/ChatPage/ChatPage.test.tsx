import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ChatPage } from '@/components/ChatPage/ChatPage';

describe('ChatPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows welcome panel when empty, then messages after send', () => {
    render(<ChatPage />);

    expect(
      screen.getByText(/hello, i am mammetbot/i)
    ).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/ask me anything/i);
    fireEvent.change(input, { target: { value: 'Hello bot' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(screen.queryByText(/hello, i am mammetbot/i)).not.toBeInTheDocument();
    expect(screen.getByText('Hello bot')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(
      screen.getByText(/i'm mammetbot! this is a demo response/i)
    ).toBeInTheDocument();
  });

  it('does not send empty messages', () => {
    render(<ChatPage />);
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    expect(screen.getByText(/hello, i am mammetbot/i)).toBeInTheDocument();
  });
});
