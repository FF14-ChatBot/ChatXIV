import { isDebug } from '../debug.js';
import type { Logger } from './types.js';

function log(level: string, message: string, context?: Record<string, unknown>): void {
  const payload = context ? `${message} ${JSON.stringify(context)}` : message;
  switch (level) {
    case 'debug':
      console.debug(payload);
      break;
    case 'info':
      console.info(payload);
      break;
    case 'warn':
      console.warn(payload);
      break;
    case 'error':
      console.error(payload);
      break;
  }
}

/** Console-based logger. Debug no-ops when !isDebug(). Do not log PII. Export so app/tests can inject it. */
export function createConsoleLogger(): Logger {
  return {
    debug(message: string, context?: Record<string, unknown>): void {
      if (isDebug()) log('debug', message, context);
    },
    info(message: string, context?: Record<string, unknown>): void {
      log('info', message, context);
    },
    warn(message: string, context?: Record<string, unknown>): void {
      log('warn', message, context);
    },
    error(message: string, context?: Record<string, unknown>): void {
      log('error', message, context);
    },
  };
}
