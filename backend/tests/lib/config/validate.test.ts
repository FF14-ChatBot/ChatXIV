import { describe, it, expect, vi, afterEach } from 'vitest';
import { ENV_KEYS } from '@src/lib/config/constants.js';
import { validateStartupConfig, validateRequiredEnvKeys } from '@src/lib/config/validate.js';

describe('lib/config/validate', () => {
  const savedEnv = { ...process.env };
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

  afterEach(() => {
    process.env = { ...savedEnv };
    exitSpy.mockClear();
    errorSpy.mockClear();
    warnSpy.mockClear();
  });

  it('does not exit when no startup-required vars are configured', () => {
    delete process.env.OIDC_ISSUER;
    delete process.env.FRONTEND_ORIGIN;
    validateStartupConfig();
    expect(exitSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns when OIDC is configured but FRONTEND_ORIGIN is not set', () => {
    process.env.OIDC_ISSUER = 'https://accounts.google.com';
    delete process.env.FRONTEND_ORIGIN;
    validateStartupConfig();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('FRONTEND_ORIGIN'));
  });

  it('warns when Loki env is partially set', () => {
    delete process.env[ENV_KEYS.LOKI_USER_ID];
    delete process.env[ENV_KEYS.LOKI_PASSWORD];
    process.env[ENV_KEYS.LOKI_HOST] = 'https://logs.example.com';
    validateStartupConfig();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Partial Loki configuration'));
  });

  it('does not warn for Loki when all three or none are set', () => {
    delete process.env[ENV_KEYS.LOKI_HOST];
    delete process.env[ENV_KEYS.LOKI_USER_ID];
    delete process.env[ENV_KEYS.LOKI_PASSWORD];
    validateStartupConfig();
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockClear();
    process.env[ENV_KEYS.LOKI_HOST] = 'https://logs.example.com';
    process.env[ENV_KEYS.LOKI_USER_ID] = 'u';
    process.env[ENV_KEYS.LOKI_PASSWORD] = 'p';
    validateStartupConfig();
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Partial Loki'));
  });

  it('exits with code 1 and logs when a required key is missing', () => {
    const key = 'CHATXIV_VALIDATE_TEST_MISSING';
    delete process.env[key];
    validateRequiredEnvKeys([key]);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(key));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('does not exit when all listed keys are set', () => {
    const key = 'CHATXIV_VALIDATE_TEST_PRESENT';
    process.env[key] = 'ok';
    validateRequiredEnvKeys([key]);
    expect(exitSpy).not.toHaveBeenCalled();
    delete process.env[key];
  });
});
