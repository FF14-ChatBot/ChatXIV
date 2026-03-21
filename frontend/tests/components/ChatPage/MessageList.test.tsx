import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageList } from '@/components/ChatPage/MessageList';

describe('MessageList', () => {
  it('renders user and assistant messages', () => {
    render(
      <MessageList
        messages={[
          { id: '1', text: 'Hello', role: 'user' },
          { id: '2', text: 'Hi there', role: 'assistant' },
        ]}
      />
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });
});
