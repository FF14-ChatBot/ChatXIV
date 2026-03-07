import { describe, it, expect, beforeEach } from 'vitest';
import { createRunId, initRun, clearRun, recordCall, getCalls } from './debugCapture.js';

describe('lib/debug/debugCapture', () => {
  let runId: number;

  beforeEach(() => {
    runId = createRunId();
    initRun(runId);
  });

  it('no-ops when recording without an initialized run', () => {
    const uninitializedRunId = createRunId();
    recordCall(uninitializedRunId, {
      name: 'x',
      request: { method: 'GET', url: 'https://example.com', headers: { authorization: 'secret' } },
      response: { status: 200 },
    });
    expect(getCalls(uninitializedRunId)).toEqual([]);
  });

  it('redacts sensitive headers and query params and returns copies', () => {
    recordCall(runId, {
      name: 'call',
      request: {
        method: 'POST',
        url: 'https://example.com/api?token=abc&keep=yes&auth=zzz',
        headers: { Authorization: 'secret', 'x-api-key': 'k', ok: '1' },
        body: { hello: 'world' },
      },
      response: {
        status: 200,
        headers: { cookie: 'session=1', ok: '2' },
        body: { ok: true },
      },
    });

    const calls1 = getCalls(runId);
    expect(calls1).toHaveLength(1);
    expect(calls1[0].request.headers).toEqual({
      Authorization: '[redacted]',
      'x-api-key': '[redacted]',
      ok: '1',
    });
    expect(calls1[0].response.headers).toEqual({ cookie: '[redacted]', ok: '2' });
    expect(calls1[0].request.url).toContain('token=%5Bredacted%5D');
    expect(calls1[0].request.url).toContain('auth=%5Bredacted%5D');
    expect(calls1[0].request.url).toContain('keep=yes');

    calls1[0].name = 'mutated';
    const calls2 = getCalls(runId);
    expect(calls2[0].name).toBe('call');
  });

  it('keeps url unchanged when it cannot be parsed', () => {
    recordCall(runId, {
      name: 'bad-url',
      request: { method: 'GET', url: 'not a url', headers: undefined },
      response: { status: 200, headers: undefined },
    });

    const calls = getCalls(runId);
    expect(calls[0].request.url).toBe('not a url');
    expect(calls[0].request.headers).toBeUndefined();
    expect(calls[0].response.headers).toBeUndefined();
  });

  it('clears a run', () => {
    recordCall(runId, {
      name: 'x',
      request: { method: 'GET', url: 'https://example.com', headers: {} },
      response: { status: 200, headers: {} },
    });
    expect(getCalls(runId)).toHaveLength(1);
    clearRun(runId);
    expect(getCalls(runId)).toEqual([]);
  });
});
