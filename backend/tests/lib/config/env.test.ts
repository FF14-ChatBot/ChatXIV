import { describe, it, expect, afterEach } from 'vitest';
import {
  getPort,
  getNodeEnv,
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
} from '@src/lib/config/env.js';

describe('lib/config/env', () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  describe('getNodeEnv', () => {
    it('returns "development" by default', () => {
      delete process.env.NODE_ENV;
      expect(getNodeEnv()).toBe('development');
    });

    it('returns "production" when set', () => {
      process.env.NODE_ENV = 'production';
      expect(getNodeEnv()).toBe('production');
    });

    it('returns "test" when set', () => {
      process.env.NODE_ENV = 'test';
      expect(getNodeEnv()).toBe('test');
    });

    it('falls back to "development" for unknown values', () => {
      process.env.NODE_ENV = 'staging' as never;
      expect(getNodeEnv()).toBe('development');
    });
  });

  describe('isProduction', () => {
    it('returns true when NODE_ENV is "production"', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
    });

    it('returns false when NODE_ENV is "development"', () => {
      delete process.env.NODE_ENV;
      expect(isProduction()).toBe(false);
    });

    it('returns false when NODE_ENV is "test"', () => {
      process.env.NODE_ENV = 'test';
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
    it('returns "./data" by default', () => {
      delete process.env.DATA_DIR;
      expect(getDataDir()).toBe('./data');
    });

    it('returns env value when set', () => {
      process.env.DATA_DIR = '/var/lib/chatxiv';
      expect(getDataDir()).toBe('/var/lib/chatxiv');
    });
  });

  describe('getAppDatabasePath', () => {
    it('in test uses a per-worker temp file', () => {
      process.env.NODE_ENV = 'test';
      process.env.VITEST_WORKER_ID = '3';
      const got = getAppDatabasePath();
      expect(got).toContain('chatxiv-test-w3');
      expect(got.endsWith('.db')).toBe(true);
    });

    it('uses DATA_DIR/app.db when not in test', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATA_DIR = './myobsdata';
      expect(getAppDatabasePath()).toMatch(/myobsdata[\\/]app\.db$/);
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
});
