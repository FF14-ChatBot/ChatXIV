import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageList } from '@/features/chat/MessageList';
import { ConversationRole } from '@chatxiv/cdm';
import type { SourceCitation } from '@chatxiv/cdm';

const SOURCES: SourceCitation[] = [
  {
    sourceName: 'The Lodestone',
    sourceUrl: 'https://lodestone.example.com',
    patchOrDate: 'Patch 7.1',
  },
  { sourceName: 'XIVAPI' },
];

describe('MessageList', () => {
  it('renders user and assistant messages', () => {
    render(
      <MessageList
        messages={[
          { id: '1', text: 'Hello', role: ConversationRole.User },
          { id: '2', text: 'Hi there', role: ConversationRole.Assistant },
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
          { id: '1', text: 'Hello', role: ConversationRole.User },
          { id: '2', text: 'Hi there', role: ConversationRole.Assistant },
        ]}
      />
    );
    expect(
      screen.getByRole('group', { name: /Rate this assistant response/i })
    ).toBeInTheDocument();
  });

  it('renders source dropdown when assistant message has sources', () => {
    render(
      <MessageList
        messages={[
          { id: '1', text: 'Response', role: ConversationRole.Assistant, sources: SOURCES },
        ]}
      />
    );
    expect(screen.getByRole('button', { name: /source/i })).toBeInTheDocument();
  });

  it('renders separator between sources and feedback when sources exist', () => {
    render(
      <MessageList
        messages={[
          { id: '1', text: 'Response', role: ConversationRole.Assistant, sources: SOURCES },
        ]}
      />
    );
    expect(screen.getByText('|')).toBeInTheDocument();
  });

  it('does not render source dropdown or separator when sources are absent', () => {
    render(
      <MessageList messages={[{ id: '1', text: 'Response', role: ConversationRole.Assistant }]} />
    );
    expect(screen.queryByRole('button', { name: /source/i })).not.toBeInTheDocument();
    expect(screen.queryByText('|')).not.toBeInTheDocument();
  });

  it('opens source dropdown to show sources in footer row', () => {
    render(
      <MessageList
        messages={[
          { id: '1', text: 'Response', role: ConversationRole.Assistant, sources: SOURCES },
        ]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /source/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('The Lodestone')).toBeInTheDocument();
    expect(screen.getByText('XIVAPI')).toBeInTheDocument();
  });

  it('shows the Thinking indicator when isSending is true', () => {
    render(<MessageList messages={[]} isSending />);
    expect(screen.getByRole('status', { name: /thinking/i })).toBeInTheDocument();
  });

  it('does not show the Thinking indicator when isSending is false', () => {
    render(<MessageList messages={[]} isSending={false} />);
    expect(screen.queryByRole('status', { name: /thinking/i })).not.toBeInTheDocument();
  });
});
