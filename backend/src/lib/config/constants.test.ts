import { describe, it, expect } from 'vitest';
import { ENV_KEYS, HEADERS, REDACT } from './constants.js';

describe('lib/config/constants', () => {
  it('exports stable header names', () => {
    expect(HEADERS).toEqual({
      REQUEST_ID: 'x-request-id',
      CORRELATION_ID: 'x-correlation-id',
      SESSION_ID: 'x-session-id',
    });
  });

  it('exports environment variable keys', () => {
    expect(ENV_KEYS.LOG_LEVEL).toBe('LOG_LEVEL');
    expect(ENV_KEYS.DEBUG_MODE).toBe('DEBUG_MODE');
  });

  it('exports redaction config', () => {
    expect(REDACT.HEADER_NAMES).toEqual(['authorization', 'x-api-key', 'api-key', 'cookie']);
    expect(REDACT.QUERY_PARAMS).toEqual(['key', 'token', 'api_key', 'apikey', 'auth']);
  });
});
