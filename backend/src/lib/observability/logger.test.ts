import { describe, it, expect, vi, beforeEach } from 'vitest';

type MockFn = ReturnType<typeof vi.fn>;
type LoggerLike = {
  level?: string;
  child: MockFn;
  info: MockFn;
};

let base: LoggerLike;
let childLogger: LoggerLike;
let childBindings: Record<string, unknown> | undefined;
let childInfo: ReturnType<typeof vi.fn>;
let baseInfo: ReturnType<typeof vi.fn>;
let pinoOptions: { formatters?: { level: (label: string) => { level: string } } } | undefined;

vi.mock('pino', () => {
  return {
    default: (opts: { formatters?: { level: (label: string) => { level: string } } }) => {
      pinoOptions = opts;
      return base;
    },
  };
});

describe('lib/observability/logger', () => {
  beforeEach(async () => {
    childBindings = undefined;
    childInfo = vi.fn();
    baseInfo = vi.fn();
    pinoOptions = undefined;

    childLogger = {
      child: vi.fn(() => childLogger),
      info: childInfo,
      level: 'child',
    };

    base = {
      level: 'info',
      info: baseInfo,
      child: vi.fn((bindings) => {
        childBindings = bindings;
        return childLogger;
      }),
    };

    vi.resetModules();
  });

  it('passes through non-function properties', async () => {
    const { logger } = await import('./logger.js');
    expect(logger.level).toBe('info');
  });

  it('configures pino level formatter', async () => {
    await import('./logger.js');
    expect(pinoOptions).toBeTruthy();
    expect(pinoOptions?.formatters?.level('warn')).toEqual({ level: 'warn' });
  });

  it('logs without child bindings when no request context', async () => {
    const { logger } = await import('./logger.js');
    logger.info({ a: 1 }, 'msg');
    expect(baseInfo).toHaveBeenCalledWith({ a: 1 }, 'msg');
    expect(childBindings).toBeUndefined();
    expect(childInfo).not.toHaveBeenCalled();
  });

  it('adds requestId (and sessionId when present) via child logger', async () => {
    const { logger } = await import('./logger.js');
    const { requestContext } = await import('../request/requestContext.js');

    requestContext.run({ requestId: 'r1' }, () => {
      logger.info('hello');
    });
    expect(childBindings).toEqual({ requestId: 'r1' });
    expect(childInfo).toHaveBeenCalledWith('hello');

    childBindings = undefined;
    requestContext.run({ requestId: 'r2', sessionId: 's2' }, () => {
      logger.info('world');
    });
    expect(childBindings).toEqual({ requestId: 'r2', sessionId: 's2' });
    expect(childInfo).toHaveBeenCalledWith('world');
  });
});
