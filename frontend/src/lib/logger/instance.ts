import type { Logger } from './types.js';

let instance: Logger | null = null;

/** Set the logger implementation (call once at app boot). Required before first use of logger/getLogger. */
export function setLogger(impl: Logger): void {
  instance = impl;
}

/** Get the current implementation. Throws if setLogger() has not been called. */
export function getLogger(): Logger {
  if (instance === null) {
    throw new Error('Logger not initialized. Call setLogger() at app boot (e.g. in main.tsx).');
  }
  return instance;
}

/** Logger that delegates to the injected implementation. Use this in app code. */
export const logger: Logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    getLogger().debug(message, context);
  },
  info(message: string, context?: Record<string, unknown>): void {
    getLogger().info(message, context);
  },
  warn(message: string, context?: Record<string, unknown>): void {
    getLogger().warn(message, context);
  },
  error(message: string, context?: Record<string, unknown>): void {
    getLogger().error(message, context);
  },
};
