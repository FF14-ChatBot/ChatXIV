import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isDebug } from '@/lib/debug.js';
import { setLogger, getLogger, logger } from '@/lib/logger/instance.js';
import { createConsoleLogger } from '@/lib/logger/consoleLogger.js';

vi.mock('@/lib/debug.js', () => ({ isDebug: vi.fn() }));

describe('logger', () => {
  beforeEach(() => {
    setLogger(createConsoleLogger());
    vi.mocked(isDebug).mockReturnValue(false);
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    setLogger(createConsoleLogger());
    vi.restoreAllMocks();
  });

  it('info logs to console', () => {
    logger.info('test');
    expect(console.info).toHaveBeenCalledWith('test');
  });

  it('warn logs to console', () => {
    logger.warn('warn msg');
    expect(console.warn).toHaveBeenCalledWith('warn msg');
  });

  it('error logs to console', () => {
    logger.error('err');
    expect(console.error).toHaveBeenCalledWith('err');
  });

  it('debug does nothing when !isDebug()', () => {
    vi.mocked(isDebug).mockReturnValue(false);
    logger.debug('no');
    expect(console.debug).not.toHaveBeenCalled();
  });

  it('debug logs when isDebug()', () => {
    vi.mocked(isDebug).mockReturnValue(true);
    logger.debug('yes');
    expect(console.debug).toHaveBeenCalledWith('yes');
  });

  it('appends context as JSON when provided', () => {
    logger.info('msg', { requestId: 'r1' });
    expect(console.info).toHaveBeenCalledWith('msg {"requestId":"r1"}');
  });

  it('setLogger swaps implementation and logger delegates to it', () => {
    const mock = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    setLogger(mock);
    logger.info('delegated');
    expect(mock.info).toHaveBeenCalledWith('delegated', undefined);
  });

  it('getLogger returns current implementation', () => {
    const mock = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    setLogger(mock);
    expect(getLogger()).toBe(mock);
  });

  it('getLogger throws when setLogger was not called', async () => {
    vi.resetModules();
    const { getLogger: getLoggerFresh } = await import('@/lib/logger/instance.js');
    expect(() => getLoggerFresh()).toThrow('Logger not initialized');
  });
});
