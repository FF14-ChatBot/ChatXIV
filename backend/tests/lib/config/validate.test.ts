import { describe, it, expect, vi, afterEach } from 'vitest';
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

  it('does not exit or warn when no startup-required vars are configured', () => {
    delete process.env.OIDC_ISSUER;
    delete process.env.FRONTEND_ORIGIN;
    validateStartupConfig();
    expect(exitSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
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
