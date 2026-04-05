import pino from 'pino';
import type { LokiOptions } from 'pino-loki';
import { getLogLevel, getLokiPushConfig, getNodeEnv } from '../config/env.js';
import { requestContext } from '../request/requestContext.js';

function createBaseLogger(): pino.Logger {
  const level = getLogLevel();
  const formatters = {
    level: (label: string) => ({ level: label }),
  };

  const loki = getLokiPushConfig();
  if (!loki) {
    return pino({ level, formatters });
  }

  const lokiOptions = {
    host: loki.host,
    basicAuth: { username: loki.userId, password: loki.password },
    labels: {
      job: 'chatxiv-backend',
      env: getNodeEnv(),
    },
  } satisfies LokiOptions;

  const lokiTransport = pino.transport<Record<string, unknown>>({
    target: 'pino-loki',
    options: lokiOptions,
  });

  /* process.stdout here stays on the main thread; pino/file inside a worker often prints nowhere in dev. */
  const destination = pino.multistream([
    { level, stream: process.stdout },
    { level, stream: lokiTransport },
  ]);

  return pino({ level, formatters }, destination);
}

const baseLogger = createBaseLogger();

/** Adds requestId (and sessionId when set) from request context to every log line so handlers don't need to pass req. */
function createRequestAwareLogger(): pino.Logger {
  return new Proxy(baseLogger, {
    get(target, prop: keyof pino.Logger) {
      const value = target[prop];
      if (typeof value !== 'function') return value;

      return (...args: unknown[]) => {
        const ctx = requestContext.get();
        const bindings = ctx
          ? { requestId: ctx.requestId, ...(ctx.sessionId && { sessionId: ctx.sessionId }) }
          : {};
        const child = Object.keys(bindings).length > 0 ? target.child(bindings) : target;
        const method = child[prop] as (...a: unknown[]) => void;
        return method.apply(child, args);
      };
    },
  }) as pino.Logger;
}

export const logger = createRequestAwareLogger();
