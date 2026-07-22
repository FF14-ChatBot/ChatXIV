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
  XIVAPI_BASE_URL,
  XIVAPI_TIMEOUT_MS,
  XIVAPI_RATE_LIMIT_PER_SECOND,
  XIVAPI_RATE_LIMIT_BURST,
  MediaWikiWikiId,
  MEDIAWIKI_DEFAULT_BASE_URLS,
  MEDIAWIKI_DEFAULT_TIMEOUT_MS,
  MEDIAWIKI_DEFAULT_RATE_LIMIT_PER_SECOND,
  CACHE_TTL_XIVAPI_SEARCH_SECONDS,
  XIVAPI_SEARCH_DEFAULT_LIMIT,
  XIVAPI_DATA_SOURCE,
  CACHE_STALE_GRACE_SECONDS,
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

  it('exports XIVAPI constants', () => {
    expect(XIVAPI_BASE_URL).toBe('https://v2.xivapi.com/api');
    expect(XIVAPI_TIMEOUT_MS).toBe(5_000);
    expect(XIVAPI_RATE_LIMIT_PER_SECOND).toBe(25);
    expect(XIVAPI_RATE_LIMIT_BURST).toBe(50);
    expect(CACHE_TTL_XIVAPI_SEARCH_SECONDS).toBe(86_400);
    expect(CACHE_STALE_GRACE_SECONDS).toBe(86_400);
    expect(XIVAPI_SEARCH_DEFAULT_LIMIT).toBe(8);
    expect(XIVAPI_DATA_SOURCE).toBe('XIVAPI');
  });

  it('exports MediaWiki constants', () => {
    expect(MediaWikiWikiId.ConsoleGamesWiki).toBe('consolegameswiki');
    expect(MediaWikiWikiId.FandomFfxiv).toBe('fandom_ffxiv');
    expect(MEDIAWIKI_DEFAULT_BASE_URLS[MediaWikiWikiId.ConsoleGamesWiki]).toBe(
      'https://ffxiv.consolegameswiki.com/mediawiki/api.php'
    );
    expect(MEDIAWIKI_DEFAULT_BASE_URLS[MediaWikiWikiId.FandomFfxiv]).toBe(
      'https://finalfantasy.fandom.com/api.php'
    );
    expect(MEDIAWIKI_DEFAULT_TIMEOUT_MS).toBe(5_000);
    expect(MEDIAWIKI_DEFAULT_RATE_LIMIT_PER_SECOND).toBe(1);
  });

  it('exports MediaWiki env var keys', () => {
    expect(ENV_KEYS.MEDIAWIKI_USER_AGENT).toBe('MEDIAWIKI_USER_AGENT');
    expect(ENV_KEYS.MEDIAWIKI_TIMEOUT_MS).toBe('MEDIAWIKI_TIMEOUT_MS');
    expect(ENV_KEYS.MEDIAWIKI_RATE_LIMIT_PER_SECOND).toBe('MEDIAWIKI_RATE_LIMIT_PER_SECOND');
    expect(ENV_KEYS.MEDIAWIKI_CGW_URL).toBe('MEDIAWIKI_CGW_URL');
    expect(ENV_KEYS.MEDIAWIKI_FANDOM_FFXIV_URL).toBe('MEDIAWIKI_FANDOM_FFXIV_URL');
  });
});
