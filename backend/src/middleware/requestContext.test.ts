import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { requestContextMiddleware } from './requestContext.js';
import { requestContext } from '../lib/request/requestContext.js';
import * as debugModeModule from '../lib/debug/debugMode.js';
import * as debugCapture from '../lib/debug/debugCapture.js';
import { HEADERS } from '../lib/config/constants.js';

describe('middleware/requestContextMiddleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function createRes() {
    const headers = new Map<string, string>();
    const handlers: Record<string, Array<() => void>> = {};
    const res = {
      setHeader: (k: string, v: string) => headers.set(k, v),
      on: (event: string, fn: () => void) => {
        handlers[event] = handlers[event] ?? [];
        handlers[event].push(fn);
      },
      _emit: (event: string) => {
        for (const fn of handlers[event] ?? []) fn();
      },
      _headers: headers,
    } as unknown as Response & { _emit: (event: string) => void; _headers: Map<string, string> };
    return res;
  }

  it('sets request headers and populates requestContext using incoming request id', () => {
    vi.spyOn(debugModeModule.debugMode, 'isEnabled').mockReturnValue(false);

    const req = {
      headers: { [HEADERS.REQUEST_ID]: 'rid', [HEADERS.SESSION_ID]: 'sid' },
    } as unknown as Request;
    const res = createRes();
    const next = vi.fn(() => {
      expect(requestContext.get()).toEqual({
        requestId: 'rid',
        sessionId: 'sid',
        runId: undefined,
      });
    });

    requestContextMiddleware(req, res, next);
    expect(res._headers.get(HEADERS.REQUEST_ID)).toBe('rid');
    expect(res._headers.get(HEADERS.CORRELATION_ID)).toBe('rid');
    expect(next).toHaveBeenCalledOnce();
  });

  it('creates and clears a debug run when debug mode is enabled', () => {
    vi.spyOn(debugModeModule.debugMode, 'isEnabled').mockReturnValue(true);
    const initSpy = vi.spyOn(debugCapture, 'initRun');
    const clearSpy = vi.spyOn(debugCapture, 'clearRun');

    const req = { headers: {} } as unknown as Request;
    const res = createRes();
    const next = vi.fn();

    requestContextMiddleware(req, res, next);
    expect(initSpy).toHaveBeenCalledOnce();
    res._emit('finish');
    expect(clearSpy).toHaveBeenCalledOnce();
  });
});
