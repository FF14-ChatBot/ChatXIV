import type pino from 'pino';

/** Log process-level errors and keep the server running (never exit). Call once at startup. */
export function registerProcessErrorHandlers(log: pino.Logger): void {
  const safeLog = (msg: string, data: unknown) => {
    try {
      log.fatal(data, msg);
    } catch {
      console.error(msg, data);
    }
  };

  process.on('uncaughtException', (err: Error) => {
    safeLog('Uncaught exception', { err });
  });

  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    safeLog('Unhandled promise rejection', { err: reason, promise });
  });
}
