import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const sendChatMessageMock = vi.fn();
vi.mock('@/clients/chatxivApi/chat', () => ({
  sendChatMessage: (...args: unknown[]) => sendChatMessageMock(...args),
}));

const { ChatConversationProvider } = await import('@/features/chat/ChatConversationContext');
const { ChatSessionProvider } = await import('@/features/chat/ChatSessionContext');
const { ChatPage } = await import('@/features/chat/ChatPage');

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
  beforeEach(() => {
    sendChatMessageMock.mockReset();
    sendChatMessageMock.mockResolvedValue({
      messageId: 'm1',
      answer: 'Here is a real answer.',
      sources: [],
    });
  });

  it('shows welcome panel when empty, then messages after send', async () => {
    renderChatPage();

    expect(screen.getByRole('heading', { name: /mammetbot/i })).toBeInTheDocument();

    const input = screen.getByRole('textbox', { name: /message/i });
    fireEvent.change(input, { target: { value: 'Hello bot' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(screen.queryByRole('heading', { name: /mammetbot/i })).not.toBeInTheDocument();
    expect(screen.getByText('Hello bot')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Here is a real answer.')).toBeInTheDocument());
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

    await waitFor(() => expect(screen.getByText('Here is a real answer.')).toBeInTheDocument());

    const scroll = await screen.findByTestId('chat-scroll-region');
    Object.defineProperty(scroll, 'scrollHeight', { configurable: true, value: 900 });
    Object.defineProperty(scroll, 'clientHeight', { configurable: true, value: 200 });

    fireEvent.change(input, { target: { value: 'Second line' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(scroll.scrollTop).toBe(900);
    });
  });

  it('shows the Thinking indicator while a reply is pending, then replaces it with the answer', async () => {
    let resolveReply: (value: { messageId: string; answer: string; sources: [] }) => void;
    sendChatMessageMock.mockReturnValue(
      new Promise((resolve) => {
        resolveReply = resolve;
      })
    );
    renderChatPage();

    const input = screen.getByRole('textbox', { name: /message/i });
    fireEvent.change(input, { target: { value: 'Hello bot' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(screen.getByRole('status', { name: /thinking/i })).toBeInTheDocument();
    expect(input).toBeDisabled();

    resolveReply!({ messageId: 'm2', answer: 'Finally, an answer.', sources: [] });

    await waitFor(() =>
      expect(screen.queryByRole('status', { name: /thinking/i })).not.toBeInTheDocument()
    );
    expect(screen.getByText('Finally, an answer.')).toBeInTheDocument();
    expect(input).not.toBeDisabled();
  });
});
