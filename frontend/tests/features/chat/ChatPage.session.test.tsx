import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatSessionProvider, useChatSession } from '@/features/chat/ChatSessionContext';
import { ChatPage } from '@/features/chat/ChatPage';

function NewChatTrigger() {
  const { startNewChat } = useChatSession();
  return (
    <button type="button" onClick={startNewChat}>
      New from test
    </button>
  );
}

describe('ChatPage session reset', () => {
  it('returns to welcome when startNewChat runs after a prompt', () => {
    render(
      <ChatSessionProvider>
        <ChatPage />
        <NewChatTrigger />
      </ChatSessionProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /where am i in the msq/i }));
    expect(
      screen.queryByRole('button', { name: /where am i in the msq/i })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /new from test/i }));
    expect(screen.getByRole('button', { name: /where am i in the msq/i })).toBeInTheDocument();
  });
});
