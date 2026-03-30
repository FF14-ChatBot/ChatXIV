import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MessageFeedbackBar } from '@/features/chat/MessageFeedbackBar';

const submitFeedback = vi.fn(() => Promise.resolve({ ok: true as const }));

vi.mock('@/clients/chatxivApi/feedback', () => ({
  submitFeedback: (...args: unknown[]) => submitFeedback(...args),
}));

describe('MessageFeedbackBar', () => {
  beforeEach(() => {
    submitFeedback.mockClear();
    submitFeedback.mockResolvedValue({ ok: true });
    vi.stubGlobal('crypto', { randomUUID: () => 'feedback-idempotency' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('submits thumbs up with message id', async () => {
    render(<MessageFeedbackBar messageId="m-1" />);

    fireEvent.click(screen.getByRole('button', { name: /Mark this response as helpful/i }));

    expect(submitFeedback).toHaveBeenCalledWith(
      { messageId: 'm-1', rating: 'up', reasonCode: 'other', category: undefined },
      undefined
    );
    expect(await screen.findByText(/Thanks for the positive feedback/i)).toBeInTheDocument();
  });

  it('submits thumbs down after picking a reason', async () => {
    render(<MessageFeedbackBar messageId="m-2" />);

    fireEvent.click(screen.getByRole('button', { name: /Mark this response as not helpful/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Wrong answer' }));

    expect(submitFeedback).toHaveBeenCalledWith(
      { messageId: 'm-2', rating: 'down', reasonCode: 'wrong_answer', category: undefined },
      undefined
    );
    expect(await screen.findByText(/We will use this to improve/i)).toBeInTheDocument();
  });

  it('opens text details for Other and submits freeText', async () => {
    render(<MessageFeedbackBar messageId="m-other" />);

    fireEvent.click(screen.getByRole('button', { name: /Mark this response as not helpful/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Other' }));

    const field = screen.getByRole('textbox', { name: /describe what went wrong/i });
    fireEvent.change(field, { target: { value: 'Needs more housing tips' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));

    expect(submitFeedback).toHaveBeenCalledWith(
      {
        messageId: 'm-other',
        rating: 'down',
        reasonCode: 'other',
        category: undefined,
        freeText: 'Needs more housing tips',
      },
      undefined
    );
    expect(await screen.findByText(/We will use this to improve/i)).toBeInTheDocument();
  });

  it('does not send Other feedback until text is provided', () => {
    render(<MessageFeedbackBar messageId="m-empty-other" />);

    fireEvent.click(screen.getByRole('button', { name: /Mark this response as not helpful/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Other' }));

    const send = screen.getByRole('button', { name: 'Send feedback' });
    expect(send).toBeDisabled();
    fireEvent.click(send);
    expect(submitFeedback).not.toHaveBeenCalled();
  });

  it('returns from Other step via Back', () => {
    render(<MessageFeedbackBar messageId="m-back" />);

    fireEvent.click(screen.getByRole('button', { name: /Mark this response as not helpful/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Other' }));
    expect(screen.getByRole('textbox', { name: /describe what went wrong/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(
      screen.queryByRole('textbox', { name: /describe what went wrong/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wrong answer' })).toBeInTheDocument();
  });

  it('includes category when provided', async () => {
    render(<MessageFeedbackBar messageId="m-3" category="RAIDING" />);

    fireEvent.click(screen.getByRole('button', { name: /Mark this response as helpful/i }));

    expect(submitFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: 'm-3', category: 'RAIDING' }),
      undefined
    );
  });

  it('shows error and dismisses on try again', async () => {
    submitFeedback.mockRejectedValueOnce(new Error('fail'));

    render(<MessageFeedbackBar messageId="m-4" />);

    fireEvent.click(screen.getByRole('button', { name: /Mark this response as helpful/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not send feedback/i);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
