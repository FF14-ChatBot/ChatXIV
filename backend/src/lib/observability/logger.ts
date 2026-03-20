import pino from 'pino';
import { requestContext } from '../request/requestContext.js';
import { getLogLevel } from '../config/env.js';

const baseLogger = pino({
  level: getLogLevel(),
  formatters: {
    level: (label: string) => ({ level: label }),
  },
});

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
