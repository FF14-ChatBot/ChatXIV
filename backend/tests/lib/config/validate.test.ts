import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateStartupConfig, validateRequiredEnvKeys } from '@src/lib/config/validate.js';

describe('lib/config/validate', () => {
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    exitSpy.mockClear();
    errorSpy.mockClear();
  });

  it('does not exit when no startup-required vars are configured', () => {
    validateStartupConfig();
    expect(exitSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
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
