import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { requestContext } from '../lib/request/requestContext.js';
import { debugMode } from '../lib/debug/debugMode.js';
import { createRunId, initRun, clearRun } from '../lib/debug/debugCapture.js';
import { HEADERS } from '../lib/config/constants.js';

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers[HEADERS.REQUEST_ID] as string) ?? randomUUID();
  const sessionId = req.headers[HEADERS.SESSION_ID] as string | undefined;
  const runId = debugMode.isEnabled() ? createRunId() : undefined;
  if (runId !== undefined) initRun(runId);

  res.setHeader(HEADERS.REQUEST_ID, requestId);
  res.setHeader(HEADERS.CORRELATION_ID, requestId);

  // Clear debug buffer on finish so it's scoped to this request and doesn't leak into the next.
  res.on('finish', () => {
    if (runId !== undefined) clearRun(runId);
  });

  requestContext.run({ requestId, sessionId, runId }, () => {
    next();
  });
}
