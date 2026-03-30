import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatConversationProvider } from '@/features/chat/ChatConversationContext';
import { ChatSessionProvider } from '@/features/chat/ChatSessionContext';
import { ChatPage } from '@/features/chat/ChatPage';

function renderChatPage() {
  return render(
    <ChatSessionProvider>
      <ChatConversationProvider>
        <ChatPage />
      </ChatConversationProvider>
    </ChatSessionProvider>
  );
}

describe('ChatPage', () => {
  it('shows welcome panel when empty, then messages after send', async () => {
    renderChatPage();

    expect(screen.getByRole('heading', { name: /mammetbot/i })).toBeInTheDocument();

    const input = screen.getByRole('textbox', { name: /message/i });
    fireEvent.change(input, { target: { value: 'Hello bot' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(screen.queryByRole('heading', { name: /mammetbot/i })).not.toBeInTheDocument();
    expect(screen.getByText('Hello bot')).toBeInTheDocument();

    await waitFor(
      () => expect(screen.getByText(/i'm mammetbot! this is a demo response/i)).toBeInTheDocument(),
      { timeout: 3000 }
    );
  });

  it('does not send empty messages', () => {
    renderChatPage();
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    expect(screen.getByRole('heading', { name: /mammetbot/i })).toBeInTheDocument();
  });

  it('scrolls the message region to the bottom after sending', async () => {
    renderChatPage();
    const input = screen.getByRole('textbox', { name: /message/i });
    fireEvent.change(input, { target: { value: 'Hello bot' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    const scroll = await screen.findByTestId('chat-scroll-region');
    Object.defineProperty(scroll, 'scrollHeight', { configurable: true, value: 900 });
    Object.defineProperty(scroll, 'clientHeight', { configurable: true, value: 200 });

    fireEvent.change(input, { target: { value: 'Second line' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(scroll.scrollTop).toBe(900);
    });
  });
});
