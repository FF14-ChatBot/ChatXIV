import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '@/components/ChatPage/ChatInput';

describe('ChatInput', () => {
  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    render(<ChatInput value="" onChange={onChange} onSend={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/ask me anything/i), {
      target: { value: 'test' },
    });
    expect(onChange).toHaveBeenCalledWith('test');
  });

  it('calls onSend when Enter is pressed', () => {
    const onSend = vi.fn();
    render(<ChatInput value="hi" onChange={vi.fn()} onSend={onSend} />);

    fireEvent.keyDown(screen.getByPlaceholderText(/ask me anything/i), {
      key: 'Enter',
      code: 'Enter',
    });
    expect(onSend).toHaveBeenCalled();
  });

  it('does not call onSend for non-Enter keys', () => {
    const onSend = vi.fn();
    render(<ChatInput value="hi" onChange={vi.fn()} onSend={onSend} />);

    fireEvent.keyDown(screen.getByPlaceholderText(/ask me anything/i), {
      key: 'Escape',
      code: 'Escape',
    });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('calls onSend when send button is clicked', () => {
    const onSend = vi.fn();
    render(<ChatInput value="x" onChange={vi.fn()} onSend={onSend} />);

    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    expect(onSend).toHaveBeenCalled();
  });
});
