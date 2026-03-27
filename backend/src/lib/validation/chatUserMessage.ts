import { CHAT_MAX_USER_MESSAGE_CHARS } from '../config/constants.js';
import { AppError } from '../errors/AppError.js';

/**
 * Throws {@link AppError.validation} when `text` exceeds {@link CHAT_MAX_USER_MESSAGE_CHARS}.
 * Call from chat handlers after reading the user message string.
 */
export function assertChatUserMessageWithinLimit(text: string, requestId?: string): void {
  const max = CHAT_MAX_USER_MESSAGE_CHARS;
  if (text.length > max) {
    throw AppError.validation(`Message exceeds maximum length of ${max} characters`, requestId);
  }
}
