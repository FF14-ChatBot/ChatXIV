import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  getPort,
  getNodeEnv,
  RUNTIME_STAGE,
  shouldDotenvOverrideShellEnv,
  isProduction,
  getDataDir,
  getAnthropicApiKey,
  getAnthropicModel,
  getLogLevel,
  getDebugMode,
  getAppDatabasePath,
  getOidcIssuer,
  getOidcClientId,
  getOidcClientSecret,
  getOidcRedirectUri,
  getFrontendOrigin,
  getOauthSuccessRedirectUrl,
  getSessionSecret,
  getBootstrapAdminSubs,
  getTurnstileSecretKey,
  getLokiPushConfig,
  getMediaWikiUserAgent,
  getMediaWikiUserAgentRequired,
  validateMediaWikiConfig,
  getMediaWikiTimeoutMs,
  getMediaWikiRateLimitPerSecond,
  getMediaWikiRateLimitQueueTimeoutMs,
  getMediaWikiBaseUrl,
  getXivApiUserAgent,
} from '@src/lib/config/env.js';
import { ENV_KEYS, MediaWikiWikiId } from '@src/lib/config/constants.js';

describe('lib/config/env', () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  describe('shouldDotenvOverrideShellEnv', () => {
    it('returns true when NODE_ENV is unset (dotenv not loaded yet)', () => {
      delete process.env.NODE_ENV;
      expect(shouldDotenvOverrideShellEnv()).toBe(true);
    });

    it('returns false for production and beta', () => {
      process.env.NODE_ENV = 'production';
      expect(shouldDotenvOverrideShellEnv()).toBe(false);
      process.env.NODE_ENV = 'beta';
      expect(shouldDotenvOverrideShellEnv()).toBe(false);
    });

    it('returns true for development, test, and legacy dev', () => {
      process.env.NODE_ENV = 'development';
      expect(shouldDotenvOverrideShellEnv()).toBe(true);
      process.env.NODE_ENV = 'test';
      expect(shouldDotenvOverrideShellEnv()).toBe(true);
      process.env.NODE_ENV = 'dev' as never;
      expect(shouldDotenvOverrideShellEnv()).toBe(true);
    });
  });

  describe('getNodeEnv', () => {
    it('returns development by default', () => {
      delete process.env.NODE_ENV;
      expect(getNodeEnv()).toBe(RUNTIME_STAGE.DEVELOPMENT);
    });

    it('returns production when NODE_ENV=production', () => {
      process.env.NODE_ENV = 'production';
      expect(getNodeEnv()).toBe(RUNTIME_STAGE.PRODUCTION);
    });

    it('returns beta when NODE_ENV=beta', () => {
      process.env.NODE_ENV = 'beta';
      expect(getNodeEnv()).toBe(RUNTIME_STAGE.BETA);
    });

    it('returns development when NODE_ENV=development', () => {
      process.env.NODE_ENV = 'development';
      expect(getNodeEnv()).toBe(RUNTIME_STAGE.DEVELOPMENT);
    });

    it('normalizes test and legacy dev to development', () => {
      process.env.NODE_ENV = 'test';
      expect(getNodeEnv()).toBe(RUNTIME_STAGE.DEVELOPMENT);
      process.env.NODE_ENV = 'dev' as never;
      expect(getNodeEnv()).toBe(RUNTIME_STAGE.DEVELOPMENT);
    });

    it('does not emit invalid NODE_ENV warning for legacy dev when not under Vitest', () => {
      const savedVitest = process.env.VITEST;
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        delete process.env.VITEST;
        process.env.NODE_ENV = 'dev' as never;
        expect(getNodeEnv()).toBe(RUNTIME_STAGE.DEVELOPMENT);
        expect(warnSpy.mock.calls.some((c) => String(c[0]).includes('Invalid NODE_ENV'))).toBe(
          false
        );
      } finally {
        if (savedVitest === undefined) delete process.env.VITEST;
        else process.env.VITEST = savedVitest;
        warnSpy.mockRestore();
      }
    });

    it('falls back to development for unknown NODE_ENV', () => {
      process.env.NODE_ENV = 'staging' as never;
      expect(getNodeEnv()).toBe(RUNTIME_STAGE.DEVELOPMENT);
    });
  });

  describe('isProduction', () => {
    it('returns true when NODE_ENV is "production"', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
    });

    it('returns false when NODE_ENV is unset (logical development)', () => {
      delete process.env.NODE_ENV;
      expect(isProduction()).toBe(false);
    });

    it('returns false when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';
      expect(isProduction()).toBe(false);
    });
  });

  describe('getPort', () => {
    it('returns 3000 by default', () => {
      delete process.env.PORT;
      expect(getPort()).toBe(3000);
    });

    it('parses a valid port', () => {
      process.env.PORT = '8080';
      expect(getPort()).toBe(8080);
    });

    it('returns default for empty string', () => {
      process.env.PORT = '';
      expect(getPort()).toBe(3000);
    });

    it('throws for non-numeric value', () => {
      process.env.PORT = 'abc';
      expect(() => getPort()).toThrow('Invalid PORT');
    });

    it('throws for port 0', () => {
      process.env.PORT = '0';
      expect(() => getPort()).toThrow('Invalid PORT');
    });

    it('throws for port above 65535', () => {
      process.env.PORT = '99999';
      expect(() => getPort()).toThrow('Invalid PORT');
    });
  });

  describe('getDataDir', () => {
    it('returns code constant (not env-driven)', () => {
      delete process.env.DATA_DIR;
      expect(getDataDir()).toBe('./data');
      process.env.DATA_DIR = '/var/lib/chatxiv';
      expect(getDataDir()).toBe('./data');
    });
  });

  describe('getAppDatabasePath', () => {
    it('uses a per-worker temp file when VITEST_WORKER_ID is set', () => {
      process.env.VITEST_WORKER_ID = '3';
      const got = getAppDatabasePath();
      expect(got).toContain('chatxiv-test-w3');
      expect(got.endsWith('.db')).toBe(true);
    });

    it('uses APP_DATA_DIRECTORY/app.db when not under Vitest worker', () => {
      delete process.env.VITEST_WORKER_ID;
      process.env.NODE_ENV = 'development';
      expect(getAppDatabasePath()).toMatch(/data[\\/]app\.db$/);
    });
  });

  describe('getAnthropicApiKey', () => {
    it('returns undefined when unset', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(getAnthropicApiKey()).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      process.env.ANTHROPIC_API_KEY = '';
      expect(getAnthropicApiKey()).toBeUndefined();
    });

    it('returns the key when set', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      expect(getAnthropicApiKey()).toBe('sk-ant-test');
    });
  });

  describe('getAnthropicModel', () => {
    it('returns undefined when unset', () => {
      delete process.env.ANTHROPIC_MODEL;
      expect(getAnthropicModel()).toBeUndefined();
    });

    it('returns the model when set', () => {
      process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
      expect(getAnthropicModel()).toBe('claude-sonnet-4-20250514');
    });
  });

  describe('getLogLevel', () => {
    it('returns "info" by default', () => {
      delete process.env.LOG_LEVEL;
      expect(getLogLevel()).toBe('info');
    });

    it('returns "info" for empty string', () => {
      process.env.LOG_LEVEL = '';
      expect(getLogLevel()).toBe('info');
    });

    it.each(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const)(
      'returns "%s" when set',
      (level) => {
        process.env.LOG_LEVEL = level;
        expect(getLogLevel()).toBe(level);
      }
    );

    it('returns "info" for invalid value', () => {
      process.env.LOG_LEVEL = 'verbose';
      expect(getLogLevel()).toBe('info');
    });
  });

  describe('getDebugMode', () => {
    it('returns false by default', () => {
      delete process.env.DEBUG_MODE;
      expect(getDebugMode()).toBe(false);
    });

    it('returns false for empty string', () => {
      process.env.DEBUG_MODE = '';
      expect(getDebugMode()).toBe(false);
    });

    it.each(['true', 'TRUE', 'TrUe', '1'])('returns true when set to %j', (value) => {
      process.env.DEBUG_MODE = value;
      expect(getDebugMode()).toBe(true);
    });

    it.each(['false', '0', 'nope'])('returns false when set to %j', (value) => {
      process.env.DEBUG_MODE = value;
      expect(getDebugMode()).toBe(false);
    });
  });

  describe('getOidcIssuer', () => {
    it('returns undefined when unset', () => {
      delete process.env.OIDC_ISSUER;
      expect(getOidcIssuer()).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      process.env.OIDC_ISSUER = '';
      expect(getOidcIssuer()).toBeUndefined();
    });

    it('returns the value when set', () => {
      process.env.OIDC_ISSUER = 'https://accounts.google.com';
      expect(getOidcIssuer()).toBe('https://accounts.google.com');
    });
  });

  describe('getOidcClientId', () => {
    it('returns undefined when unset', () => {
      delete process.env.OIDC_CLIENT_ID;
      expect(getOidcClientId()).toBeUndefined();
    });

    it('returns the value when set', () => {
      process.env.OIDC_CLIENT_ID = 'my-client-id';
      expect(getOidcClientId()).toBe('my-client-id');
    });
  });

  describe('getOidcClientSecret', () => {
    it('returns undefined when unset', () => {
      delete process.env.OIDC_CLIENT_SECRET;
      expect(getOidcClientSecret()).toBeUndefined();
    });

    it('returns the value when set', () => {
      process.env.OIDC_CLIENT_SECRET = 'secret-123';
      expect(getOidcClientSecret()).toBe('secret-123');
    });
  });

  describe('getFrontendOrigin', () => {
    it('returns undefined when unset', () => {
      delete process.env.FRONTEND_ORIGIN;
      expect(getFrontendOrigin()).toBeUndefined();
    });

    it('returns normalized origin (no path)', () => {
      process.env.FRONTEND_ORIGIN = 'https://www.chatxiv.com/app/';
      expect(getFrontendOrigin()).toBe('https://www.chatxiv.com');
    });

    it('accepts http with port', () => {
      process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
      expect(getFrontendOrigin()).toBe('http://localhost:5173');
    });

    it('returns undefined for invalid URL', () => {
      process.env.FRONTEND_ORIGIN = 'not-a-url';
      expect(getFrontendOrigin()).toBeUndefined();
    });

    it('returns undefined for non-http(s) schemes', () => {
      process.env.FRONTEND_ORIGIN = 'javascript:alert(1)';
      expect(getFrontendOrigin()).toBeUndefined();
    });
  });

  describe('getOauthSuccessRedirectUrl', () => {
    it('returns / when FRONTEND_ORIGIN unset', () => {
      delete process.env.FRONTEND_ORIGIN;
      expect(getOauthSuccessRedirectUrl()).toBe('/');
    });

    it('returns frontend root when FRONTEND_ORIGIN set', () => {
      process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
      expect(getOauthSuccessRedirectUrl()).toBe('http://localhost:5173/');
    });
  });

  describe('getOidcRedirectUri', () => {
    it('returns undefined when unset', () => {
      delete process.env.OIDC_REDIRECT_URI;
      expect(getOidcRedirectUri()).toBeUndefined();
    });

    it('returns env value when set', () => {
      process.env.OIDC_REDIRECT_URI = 'https://example.com/callback';
      expect(getOidcRedirectUri()).toBe('https://example.com/callback');
    });
  });

  describe('getSessionSecret', () => {
    it('returns undefined when unset', () => {
      delete process.env.SESSION_SECRET;
      expect(getSessionSecret()).toBeUndefined();
    });

    it('returns the value when set', () => {
      process.env.SESSION_SECRET = 'my-secret';
      expect(getSessionSecret()).toBe('my-secret');
    });
  });

  describe('getBootstrapAdminSubs', () => {
    it('returns empty array when unset', () => {
      delete process.env.BOOTSTRAP_ADMIN_SUBS;
      expect(getBootstrapAdminSubs()).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      process.env.BOOTSTRAP_ADMIN_SUBS = '';
      expect(getBootstrapAdminSubs()).toEqual([]);
    });

    it('returns empty array for whitespace-only', () => {
      process.env.BOOTSTRAP_ADMIN_SUBS = '   ';
      expect(getBootstrapAdminSubs()).toEqual([]);
    });

    it('splits comma-separated values', () => {
      process.env.BOOTSTRAP_ADMIN_SUBS = 'sub1,sub2,sub3';
      expect(getBootstrapAdminSubs()).toEqual(['sub1', 'sub2', 'sub3']);
    });

    it('trims whitespace around values', () => {
      process.env.BOOTSTRAP_ADMIN_SUBS = ' sub1 , sub2 ';
      expect(getBootstrapAdminSubs()).toEqual(['sub1', 'sub2']);
    });

    it('filters out empty segments', () => {
      process.env.BOOTSTRAP_ADMIN_SUBS = 'sub1,,sub2,';
      expect(getBootstrapAdminSubs()).toEqual(['sub1', 'sub2']);
    });
  });

  describe('getTurnstileSecretKey', () => {
    it('returns undefined when unset', () => {
      delete process.env[ENV_KEYS.TURNSTILE_SECRET_KEY];
      expect(getTurnstileSecretKey()).toBeUndefined();
    });

    it('returns trimmed value when set', () => {
      process.env[ENV_KEYS.TURNSTILE_SECRET_KEY] = '  sk-secret  ';
      expect(getTurnstileSecretKey()).toBe('sk-secret');
    });
  });

  describe('getLokiPushConfig', () => {
    it('returns undefined when any key is missing', () => {
      delete process.env[ENV_KEYS.LOKI_HOST];
      delete process.env[ENV_KEYS.LOKI_USER_ID];
      delete process.env[ENV_KEYS.LOKI_PASSWORD];
      expect(getLokiPushConfig()).toBeUndefined();

      process.env[ENV_KEYS.LOKI_HOST] = 'https://logs.example.com';
      delete process.env[ENV_KEYS.LOKI_USER_ID];
      process.env[ENV_KEYS.LOKI_PASSWORD] = 'p';
      expect(getLokiPushConfig()).toBeUndefined();
    });

    it('returns config when all keys are set and host is valid https URL', () => {
      process.env[ENV_KEYS.LOKI_HOST] = 'https://logs-prod-042.grafana.net';
      process.env[ENV_KEYS.LOKI_USER_ID] = '12345';
      process.env[ENV_KEYS.LOKI_PASSWORD] = 'token';
      expect(getLokiPushConfig()).toEqual({
        host: 'https://logs-prod-042.grafana.net',
        userId: '12345',
        password: 'token',
      });
    });

    it('normalizes host without scheme to https', () => {
      process.env[ENV_KEYS.LOKI_HOST] = 'logs-prod-042.grafana.net';
      process.env[ENV_KEYS.LOKI_USER_ID] = 'u';
      process.env[ENV_KEYS.LOKI_PASSWORD] = 'p';
      expect(getLokiPushConfig()?.host).toBe('https://logs-prod-042.grafana.net');
    });

    it('strips path from host URL', () => {
      process.env[ENV_KEYS.LOKI_HOST] = 'https://logs.example.com/loki/api/v1/push';
      process.env[ENV_KEYS.LOKI_USER_ID] = 'u';
      process.env[ENV_KEYS.LOKI_PASSWORD] = 'p';
      expect(getLokiPushConfig()?.host).toBe('https://logs.example.com');
    });

    it('returns undefined for invalid LOKI_HOST', () => {
      process.env[ENV_KEYS.LOKI_HOST] = ':::';
      process.env[ENV_KEYS.LOKI_USER_ID] = 'u';
      process.env[ENV_KEYS.LOKI_PASSWORD] = 'p';
      expect(getLokiPushConfig()).toBeUndefined();
    });
  });

  describe('getMediaWikiUserAgent', () => {
    it('returns the configured value', () => {
      process.env[ENV_KEYS.MEDIAWIKI_USER_AGENT] = 'ChatXIV/1.0 (ops@chatxiv.example)';
      expect(getMediaWikiUserAgent()).toBe('ChatXIV/1.0 (ops@chatxiv.example)');
    });

    it('falls back to a placeholder that never sends a blank header', () => {
      delete process.env[ENV_KEYS.MEDIAWIKI_USER_AGENT];
      expect(getMediaWikiUserAgent()).toBe('ChatXIV/1.0 (unconfigured-contact)');
    });
  });

  describe('getMediaWikiUserAgentRequired', () => {
    it('defaults to false when unset', () => {
      delete process.env[ENV_KEYS.MEDIAWIKI_USER_AGENT_REQUIRED];
      expect(getMediaWikiUserAgentRequired()).toBe(false);
    });

    it('parses true/1 as true and false/0 as false', () => {
      process.env[ENV_KEYS.MEDIAWIKI_USER_AGENT_REQUIRED] = 'true';
      expect(getMediaWikiUserAgentRequired()).toBe(true);
      process.env[ENV_KEYS.MEDIAWIKI_USER_AGENT_REQUIRED] = '1';
      expect(getMediaWikiUserAgentRequired()).toBe(true);
      process.env[ENV_KEYS.MEDIAWIKI_USER_AGENT_REQUIRED] = 'false';
      expect(getMediaWikiUserAgentRequired()).toBe(false);
      process.env[ENV_KEYS.MEDIAWIKI_USER_AGENT_REQUIRED] = '0';
      expect(getMediaWikiUserAgentRequired()).toBe(false);
    });
  });

  describe('validateMediaWikiConfig', () => {
    it('does nothing when MEDIAWIKI_USER_AGENT_REQUIRED is unset (default off)', () => {
      delete process.env[ENV_KEYS.MEDIAWIKI_USER_AGENT_REQUIRED];
      delete process.env[ENV_KEYS.MEDIAWIKI_USER_AGENT];
      const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
      validateMediaWikiConfig();
      expect(exit).not.toHaveBeenCalled();
      exit.mockRestore();
    });

    it('exits when required and MEDIAWIKI_USER_AGENT is unset', () => {
      process.env[ENV_KEYS.MEDIAWIKI_USER_AGENT_REQUIRED] = 'true';
      delete process.env[ENV_KEYS.MEDIAWIKI_USER_AGENT];
      const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      validateMediaWikiConfig();
      expect(error).toHaveBeenCalled();
      expect(exit).toHaveBeenCalledWith(1);
      exit.mockRestore();
      error.mockRestore();
    });

    it('exits when required and MEDIAWIKI_USER_AGENT is blank/whitespace', () => {
      process.env[ENV_KEYS.MEDIAWIKI_USER_AGENT_REQUIRED] = 'true';
      process.env[ENV_KEYS.MEDIAWIKI_USER_AGENT] = '   ';
      const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      validateMediaWikiConfig();
      expect(exit).toHaveBeenCalledWith(1);
      exit.mockRestore();
      error.mockRestore();
    });

    it('does not exit when required and MEDIAWIKI_USER_AGENT is set', () => {
      process.env[ENV_KEYS.MEDIAWIKI_USER_AGENT_REQUIRED] = 'true';
      process.env[ENV_KEYS.MEDIAWIKI_USER_AGENT] = 'ChatXIV/1.0 (ops@chatxiv.example)';
      const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
      validateMediaWikiConfig();
      expect(exit).not.toHaveBeenCalled();
      exit.mockRestore();
    });
  });

  describe('getXivApiUserAgent', () => {
    it('returns the configured value', () => {
      process.env[ENV_KEYS.XIVAPI_USER_AGENT] = 'ChatXIV/1.0 (ops@chatxiv.example)';
      expect(getXivApiUserAgent()).toBe('ChatXIV/1.0 (ops@chatxiv.example)');
    });

    it('falls back to a placeholder that never sends a blank header', () => {
      delete process.env[ENV_KEYS.XIVAPI_USER_AGENT];
      expect(getXivApiUserAgent()).toBe('ChatXIV/1.0 (unconfigured-contact)');
    });
  });

  describe('getMediaWikiTimeoutMs', () => {
    it('returns the default when unset', () => {
      delete process.env[ENV_KEYS.MEDIAWIKI_TIMEOUT_MS];
      expect(getMediaWikiTimeoutMs()).toBe(5_000);
    });

    it('parses a valid value', () => {
      process.env[ENV_KEYS.MEDIAWIKI_TIMEOUT_MS] = '8000';
      expect(getMediaWikiTimeoutMs()).toBe(8_000);
    });

    it('returns the default for a non-numeric or non-positive value', () => {
      process.env[ENV_KEYS.MEDIAWIKI_TIMEOUT_MS] = 'abc';
      expect(getMediaWikiTimeoutMs()).toBe(5_000);
      process.env[ENV_KEYS.MEDIAWIKI_TIMEOUT_MS] = '0';
      expect(getMediaWikiTimeoutMs()).toBe(5_000);
    });

    it('returns the default when the value overflows to Infinity', () => {
      process.env[ENV_KEYS.MEDIAWIKI_TIMEOUT_MS] = '1' + '0'.repeat(400);
      expect(getMediaWikiTimeoutMs()).toBe(5_000);
    });

    it('parses scientific notation instead of truncating it (regression: parseInt truncation)', () => {
      process.env[ENV_KEYS.MEDIAWIKI_TIMEOUT_MS] = '5e3';
      expect(getMediaWikiTimeoutMs()).toBe(5_000);
    });

    it('rejects a garbage-suffixed value instead of silently truncating it', () => {
      process.env[ENV_KEYS.MEDIAWIKI_TIMEOUT_MS] = '5000ms';
      expect(getMediaWikiTimeoutMs()).toBe(5_000);
    });
  });

  describe('getMediaWikiRateLimitPerSecond', () => {
    it('returns the default when unset', () => {
      delete process.env[ENV_KEYS.MEDIAWIKI_RATE_LIMIT_PER_SECOND];
      expect(getMediaWikiRateLimitPerSecond()).toBe(1);
    });

    it('parses a valid value', () => {
      process.env[ENV_KEYS.MEDIAWIKI_RATE_LIMIT_PER_SECOND] = '2';
      expect(getMediaWikiRateLimitPerSecond()).toBe(2);
    });

    it('returns the default for a non-numeric or non-positive value', () => {
      process.env[ENV_KEYS.MEDIAWIKI_RATE_LIMIT_PER_SECOND] = 'abc';
      expect(getMediaWikiRateLimitPerSecond()).toBe(1);
      process.env[ENV_KEYS.MEDIAWIKI_RATE_LIMIT_PER_SECOND] = '-1';
      expect(getMediaWikiRateLimitPerSecond()).toBe(1);
    });
  });

  describe('getMediaWikiRateLimitQueueTimeoutMs', () => {
    it('returns the default when unset', () => {
      delete process.env[ENV_KEYS.MEDIAWIKI_RATE_LIMIT_QUEUE_TIMEOUT_MS];
      expect(getMediaWikiRateLimitQueueTimeoutMs()).toBe(4_000);
    });

    it('parses a valid value', () => {
      process.env[ENV_KEYS.MEDIAWIKI_RATE_LIMIT_QUEUE_TIMEOUT_MS] = '2500';
      expect(getMediaWikiRateLimitQueueTimeoutMs()).toBe(2_500);
    });

    it('returns the default for a non-numeric or non-positive value', () => {
      process.env[ENV_KEYS.MEDIAWIKI_RATE_LIMIT_QUEUE_TIMEOUT_MS] = 'abc';
      expect(getMediaWikiRateLimitQueueTimeoutMs()).toBe(4_000);
      process.env[ENV_KEYS.MEDIAWIKI_RATE_LIMIT_QUEUE_TIMEOUT_MS] = '-1';
      expect(getMediaWikiRateLimitQueueTimeoutMs()).toBe(4_000);
    });
  });

  describe('getMediaWikiBaseUrl', () => {
    it('returns the built-in default when unset', () => {
      delete process.env[ENV_KEYS.MEDIAWIKI_CGW_URL];
      expect(getMediaWikiBaseUrl(MediaWikiWikiId.ConsoleGamesWiki)).toBe(
        'https://ffxiv.consolegameswiki.com/mediawiki/api.php'
      );
    });

    it('returns the env override when set', () => {
      process.env[ENV_KEYS.MEDIAWIKI_CGW_URL] = 'https://staging.example.com/api.php';
      expect(getMediaWikiBaseUrl(MediaWikiWikiId.ConsoleGamesWiki)).toBe(
        'https://staging.example.com/api.php'
      );
    });

    it('resolves each wikiId independently', () => {
      delete process.env[ENV_KEYS.MEDIAWIKI_FANDOM_FFXIV_URL];
      expect(getMediaWikiBaseUrl(MediaWikiWikiId.FandomFfxiv)).toBe(
        'https://finalfantasy.fandom.com/api.php'
      );
    });
  });
});
