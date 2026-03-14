import { describe, it, expect } from 'vitest';
import { ERROR_CODES } from '@chatxiv/cdm';
import { getDisplayMessage, ERROR_CODE_TO_MESSAGE, FALLBACK_MESSAGE } from './messages';

describe('error messages', () => {
  it('returns mapped message for known code', () => {
    expect(getDisplayMessage(ERROR_CODES.RATE_LIMITED)).toBe(
      "You've reached the limit for now; please try again later."
    );
    expect(getDisplayMessage(ERROR_CODES.NO_SOURCED_ANSWER)).toBe(
      "I couldn't find a sourced answer for that."
    );
  });

  it('returns fallback for unknown or empty code', () => {
    expect(getDisplayMessage()).toBe(FALLBACK_MESSAGE);
    expect(getDisplayMessage('')).toBe(FALLBACK_MESSAGE);
    expect(getDisplayMessage('UNKNOWN_CODE')).toBe(FALLBACK_MESSAGE);
  });

  it('ERROR_CODE_TO_MESSAGE has an entry for every ERROR_CODES value', () => {
    for (const code of Object.values(ERROR_CODES)) {
      expect(ERROR_CODE_TO_MESSAGE[code]).toBeDefined();
      expect(typeof ERROR_CODE_TO_MESSAGE[code]).toBe('string');
    }
  });
});
