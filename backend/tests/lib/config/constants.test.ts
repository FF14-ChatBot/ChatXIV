import { describe, it, expect } from 'vitest';
import {
  APP_DATA_DIRECTORY,
  ENV_KEYS,
  HEADERS,
  MAX_JSON_BODY_SIZE_KB,
  RATE_LIMIT_BUCKET_CAPACITY,
  RATE_LIMIT_REFILL_PER_MINUTE,
  REDACT,
  REQUEST_TIMEOUT_MS,
} from '@src/lib/config/constants.js';

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
  });

  it('exports code-only tuning constants', () => {
    expect(APP_DATA_DIRECTORY).toBe('./data');
    expect(MAX_JSON_BODY_SIZE_KB).toBe(50);
    expect(REQUEST_TIMEOUT_MS).toBe(30_000);
    expect(RATE_LIMIT_BUCKET_CAPACITY).toBe(20);
    expect(RATE_LIMIT_REFILL_PER_MINUTE).toBe(4);
  });

  it('exports redaction config', () => {
    expect(REDACT.HEADER_NAMES).toEqual(['authorization', 'x-api-key', 'api-key', 'cookie']);
    expect(REDACT.QUERY_PARAMS).toEqual(['key', 'token', 'api_key', 'apikey', 'auth']);
  });
});
