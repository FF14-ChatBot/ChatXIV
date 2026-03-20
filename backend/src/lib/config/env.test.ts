import { describe, it, expect, afterEach } from 'vitest';
import {
  getPort,
  getNodeEnv,
  getDataDir,
  getAnthropicApiKey,
  getAnthropicModel,
  getAdminApiKey,
} from './env.js';

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

  describe('getAdminApiKey', () => {
    it('returns undefined when unset', () => {
      delete process.env.ADMIN_API_KEY;
      expect(getAdminApiKey()).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      process.env.ADMIN_API_KEY = '';
      expect(getAdminApiKey()).toBeUndefined();
    });

    it('returns the key when set', () => {
      process.env.ADMIN_API_KEY = 'my-admin-key';
      expect(getAdminApiKey()).toBe('my-admin-key');
    });
  });
});
