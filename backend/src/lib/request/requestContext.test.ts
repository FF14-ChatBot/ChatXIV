import { describe, it, expect } from 'vitest';
import { requestContext } from './requestContext.js';

describe('lib/request/requestContext', () => {
  it('returns undefined when no context is active', () => {
    expect(requestContext.get()).toBeUndefined();
    expect(requestContext.getRunId()).toBeUndefined();
  });

  it('exposes request context inside run()', () => {
    requestContext.run({ requestId: 'r1', sessionId: 's1', runId: 123 }, () => {
      expect(requestContext.get()).toEqual({ requestId: 'r1', sessionId: 's1', runId: 123 });
      expect(requestContext.getRunId()).toBe(123);
    });
  });

  it('propagates context across async boundaries', async () => {
    await requestContext.run({ requestId: 'r2' }, async () => {
      await Promise.resolve();
      expect(requestContext.get()).toEqual({ requestId: 'r2' });
    });
  });

  it('restores outer context after nested run()', () => {
    requestContext.run({ requestId: 'outer', runId: 1 }, () => {
      expect(requestContext.getRunId()).toBe(1);

      requestContext.run({ requestId: 'inner', runId: 2 }, () => {
        expect(requestContext.getRunId()).toBe(2);
      });

      expect(requestContext.getRunId()).toBe(1);
      expect(requestContext.get()?.requestId).toBe('outer');
    });
  });
});
