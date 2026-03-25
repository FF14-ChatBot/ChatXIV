import { describe, it, expect } from 'vitest';
import { ENV_KEYS, HEADERS, REDACT } from '@src/lib/config/constants.js';

describe('lib/config/constants', () => {
  it('exports stable header names', () => {
    expect(HEADERS).toEqual({
      REQUEST_ID: 'x-request-id',
      CORRELATION_ID: 'x-correlation-id',
      SESSION_ID: 'x-session-id',
    });
  });

  it('exports environment variable keys', () => {
    expect(ENV_KEYS.NODE_ENV).toBe('NODE_ENV');
    expect(ENV_KEYS.PORT).toBe('PORT');
    expect(ENV_KEYS.CORS_ORIGIN).toBe('CORS_ORIGIN');
    expect(ENV_KEYS.LOG_LEVEL).toBe('LOG_LEVEL');
    expect(ENV_KEYS.DEBUG_MODE).toBe('DEBUG_MODE');
    expect(ENV_KEYS.ANTHROPIC_API_KEY).toBe('ANTHROPIC_API_KEY');
    expect(ENV_KEYS.ANTHROPIC_MODEL).toBe('ANTHROPIC_MODEL');
    expect(ENV_KEYS.DATA_DIR).toBe('DATA_DIR');
  });

  it('exports redaction config', () => {
    expect(REDACT.HEADER_NAMES).toEqual(['authorization', 'x-api-key', 'api-key', 'cookie']);
    expect(REDACT.QUERY_PARAMS).toEqual(['key', 'token', 'api_key', 'apikey', 'auth']);
  });
});
