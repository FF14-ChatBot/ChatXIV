import 'reflect-metadata';
import { app } from './app.js';
import { logger } from './lib/observability/logger.js';
import { registerProcessErrorHandlers } from './lib/errors/registerProcessErrorHandlers.js';
import { validateStartupConfig } from './lib/config/validate.js';
import { getPort } from './lib/config/env.js';

validateStartupConfig();
registerProcessErrorHandlers(logger);

const port = getPort();
const shutdownTimeoutMs = 10_000;

const server = app.listen(port, () => {
  logger.info({ port }, 'Server listening');
});

let shuttingDown = false;

const gracefulShutdown = (signal: NodeJS.Signals): void => {
  if (shuttingDown) {
    logger.warn({ signal }, 'Shutdown already in progress');
    return;
  }

  shuttingDown = true;
  logger.info({ signal, shutdownTimeoutMs }, 'Received shutdown signal');

  const forceExitTimer = setTimeout(() => {
    logger.error({ signal, shutdownTimeoutMs }, 'Forced shutdown after timeout');
    process.exit(1);
  }, shutdownTimeoutMs);
  forceExitTimer.unref();

  server.close((error) => {
    clearTimeout(forceExitTimer);

    if (error) {
      logger.error({ error, signal }, 'Failed to close server cleanly');
      process.exit(1);
      return;
    }

    logger.info({ signal }, 'Server closed cleanly');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
