import { describe, it, expect } from 'vitest';
import { assertChatUserMessageWithinLimit } from '@src/lib/validation/chatUserMessage.js';
import { CHAT_MAX_USER_MESSAGE_CHARS } from '@src/lib/config/constants.js';

describe('assertChatUserMessageWithinLimit', () => {
  it('allows short and empty-adjacent messages', () => {
    expect(() => assertChatUserMessageWithinLimit('Where corn?', 'r1')).not.toThrow();
    expect(() => assertChatUserMessageWithinLimit('', 'r1')).not.toThrow();
  });

  it('allows text at the hard cap', () => {
    expect(() =>
      assertChatUserMessageWithinLimit('x'.repeat(CHAT_MAX_USER_MESSAGE_CHARS), 'r1')
    ).not.toThrow();
  });

  it('throws validation when over limit', () => {
    expect(() =>
      assertChatUserMessageWithinLimit('x'.repeat(CHAT_MAX_USER_MESSAGE_CHARS + 1), 'rid')
    ).toThrowError(
      expect.objectContaining({
        status: 400,
        code: 'VALIDATION_ERROR',
        requestId: 'rid',
      })
    );
  });
});
