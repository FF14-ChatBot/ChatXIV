import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Logger } from '@/lib/logger/types';
import { setLogger } from '@/lib/logger/instance';
import { warnMissingViteEnvVars } from '@/lib/config/warnMissingViteEnv';

describe('warnMissingViteEnvVars', () => {
  const warn = vi.fn();
  const loggerImpl: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn,
    error: vi.fn(),
  };

  type EnvKeys =
    | 'VITE_DEPLOY_ENV'
    | 'VITE_CHATXIV_BACKEND_URL'
    | 'VITE_GRAFANA_FARO_URL'
    | 'VITE_APP_VERSION'
    | 'VITE_PUBLIC_POSTHOG_TOKEN'
    | 'VITE_PUBLIC_POSTHOG_HOST';

  const keys: EnvKeys[] = [
    'VITE_DEPLOY_ENV',
    'VITE_CHATXIV_BACKEND_URL',
    'VITE_GRAFANA_FARO_URL',
    'VITE_APP_VERSION',
    'VITE_PUBLIC_POSTHOG_TOKEN',
    'VITE_PUBLIC_POSTHOG_HOST',
  ];

  const fullEnv: Record<EnvKeys, string> = {
    VITE_DEPLOY_ENV: 'production',
    VITE_CHATXIV_BACKEND_URL: 'http://localhost:3000',
    VITE_GRAFANA_FARO_URL: 'https://faro.example/collect/x',
    VITE_APP_VERSION: '1.0.0',
    VITE_PUBLIC_POSTHOG_TOKEN: 'phc_token',
    VITE_PUBLIC_POSTHOG_HOST: 'https://custom.posthog.com',
  };

  function snapshotEnv(): Partial<Record<EnvKeys, string | undefined>> {
    const snapshot: Partial<Record<EnvKeys, string | undefined>> = {};
    for (const key of keys) {
      snapshot[key] = import.meta.env[key];
    }
    return snapshot;
  }

  /** Apply explicit values; pass `undefined` for a key to delete it from `import.meta.env`. */
  function applyEnv(partial: Partial<Record<EnvKeys, string | undefined>>): void {
    const env = import.meta.env as Record<string, string | undefined>;
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(partial, key)) {
        continue;
      }
      const value = partial[key];
      if (value === undefined) {
        delete env[key];
      } else {
        env[key] = value;
      }
    }
  }

  let envAtTestStart: Partial<Record<EnvKeys, string | undefined>>;

  beforeEach(() => {
    envAtTestStart = snapshotEnv();
    warn.mockClear();
    setLogger(loggerImpl);
    applyEnv(fullEnv);
  });

  afterEach(() => {
    const env = import.meta.env as Record<string, string | undefined>;
    for (const key of keys) {
      const previous = envAtTestStart[key];
      if (previous === undefined) {
        delete env[key];
      } else {
        env[key] = previous;
      }
    }
  });

  it('does not warn when all optional VITE_* vars are set', () => {
    warnMissingViteEnvVars();
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns when VITE_DEPLOY_ENV is unset', () => {
    const originalMode = import.meta.env.MODE;
    try {
      import.meta.env.MODE = 'test';
      delete (import.meta.env as { VITE_DEPLOY_ENV?: string }).VITE_DEPLOY_ENV;
      warnMissingViteEnvVars();
      expect(warn).toHaveBeenCalledWith(
        'VITE_DEPLOY_ENV is not set; using Vite MODE as deploy environment',
        { defaultUsed: 'test' }
      );
    } finally {
      import.meta.env.MODE = originalMode;
    }
  });

  it('warns when VITE_DEPLOY_ENV is whitespace only', () => {
    import.meta.env.VITE_DEPLOY_ENV = '   ';
    import.meta.env.MODE = 'production';
    warnMissingViteEnvVars();
    expect(warn).toHaveBeenCalledWith(
      'VITE_DEPLOY_ENV is not set; using Vite MODE as deploy environment',
      { defaultUsed: 'production' }
    );
  });

  it('warns for PostHog host default when token is set but host is missing', () => {
    applyEnv({
      VITE_PUBLIC_POSTHOG_HOST: undefined,
    });
    warnMissingViteEnvVars();
    expect(warn).toHaveBeenCalledWith(
      'VITE_PUBLIC_POSTHOG_HOST is not set; using default PostHog ingest host',
      { defaultUsed: 'https://us.i.posthog.com' }
    );
  });

  it('does not warn for PostHog host when token is unset', () => {
    applyEnv({
      VITE_PUBLIC_POSTHOG_TOKEN: undefined,
      VITE_PUBLIC_POSTHOG_HOST: undefined,
    });
    warnMissingViteEnvVars();
    const hostCalls = warn.mock.calls.filter((c) =>
      String(c[0]).includes('VITE_PUBLIC_POSTHOG_HOST')
    );
    expect(hostCalls).toHaveLength(0);
  });

  it('warns when VITE_CHATXIV_BACKEND_URL is unset', () => {
    applyEnv({ VITE_CHATXIV_BACKEND_URL: undefined });
    warnMissingViteEnvVars();
    expect(warn).toHaveBeenCalledWith(
      'VITE_CHATXIV_BACKEND_URL is not set; using same-origin (empty base) for API and auth',
      { defaultUsed: 'same-origin' }
    );
  });

  it('warns when VITE_GRAFANA_FARO_URL is unset', () => {
    applyEnv({ VITE_GRAFANA_FARO_URL: undefined });
    warnMissingViteEnvVars();
    expect(warn).toHaveBeenCalledWith(
      'VITE_GRAFANA_FARO_URL is not set; Faro observability is disabled',
      { defaultUsed: 'noop' }
    );
  });

  it('warns when VITE_APP_VERSION is unset', () => {
    applyEnv({ VITE_APP_VERSION: undefined });
    warnMissingViteEnvVars();
    expect(warn).toHaveBeenCalledWith('VITE_APP_VERSION is not set; using default app version', {
      defaultUsed: '0.0.0',
    });
  });

  it('warns when VITE_PUBLIC_POSTHOG_TOKEN is unset', () => {
    applyEnv({ VITE_PUBLIC_POSTHOG_TOKEN: undefined });
    warnMissingViteEnvVars();
    expect(warn).toHaveBeenCalledWith(
      'VITE_PUBLIC_POSTHOG_TOKEN is not set; PostHog analytics is disabled',
      { defaultUsed: 'noop' }
    );
  });
});
