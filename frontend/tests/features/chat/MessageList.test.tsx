import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageList } from '@/features/chat/MessageList';
import { MessageRole } from '@/types/chat';

describe('MessageList', () => {
  it('renders user and assistant messages', () => {
    render(
      <MessageList
        messages={[
          { id: '1', text: 'Hello', role: MessageRole.User },
          { id: '2', text: 'Hi there', role: MessageRole.Assistant },
        ]}
      />
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  it('shows feedback controls on assistant messages only', () => {
    render(
      <MessageList
        messages={[
          { id: '1', text: 'Hello', role: MessageRole.User },
          { id: '2', text: 'Hi there', role: MessageRole.Assistant },
        ]}
      />
    );
    expect(
      screen.getByRole('group', { name: /Rate this assistant response/i })
    ).toBeInTheDocument();
  });
});
