import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DEFAULT_CHAT_RESPONSE } from '../../mocks/sendChatMessage.mock';

const sendChatMessageMock = vi.fn();
vi.mock('@/clients/chatxivApi/chat', () => ({
  sendChatMessage: (...args: unknown[]) => sendChatMessageMock(...args),
}));
sendChatMessageMock.mockResolvedValue(DEFAULT_CHAT_RESPONSE);

const { ChatConversationProvider } = await import('@/features/chat/ChatConversationContext');
const { ChatSessionLanding, ChatSessionProvider, useChatSession } =
  await import('@/features/chat/ChatSessionContext');
const { ChatPage } = await import('@/features/chat/ChatPage');

function NewChatTrigger() {
  const { startNewChat } = useChatSession();
  return (
    <button type="button" onClick={() => startNewChat()}>
      New from test
    </button>
  );
}

function NewThreadChatTrigger() {
  const { startNewChat } = useChatSession();
  return (
    <button type="button" onClick={() => startNewChat({ landing: ChatSessionLanding.Thread })}>
      New thread from test
    </button>
  );
}

describe('ChatPage session reset', () => {
  it('returns to welcome when startNewChat runs after a prompt', () => {
    render(
      <ChatSessionProvider>
        <ChatConversationProvider>
          <ChatPage />
          <NewChatTrigger />
        </ChatConversationProvider>
      </ChatSessionProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /where am i in the msq/i }));
    expect(
      screen.queryByRole('button', { name: /where am i in the msq/i })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /new from test/i }));
    expect(screen.getByRole('button', { name: /where am i in the msq/i })).toBeInTheDocument();
  });

  it('opens the chat thread with MammetBot after startNewChat with thread landing', () => {
    render(
      <ChatSessionProvider>
        <ChatConversationProvider>
          <ChatPage />
          <NewThreadChatTrigger />
        </ChatConversationProvider>
      </ChatSessionProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /new thread from test/i }));
    expect(
      screen.queryByRole('button', { name: /where am i in the msq/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Hi! I'm MammetBot/i)).toBeInTheDocument();
  });
});
