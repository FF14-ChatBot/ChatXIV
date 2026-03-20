import 'reflect-metadata';
import { app } from './app.js';
import { logger } from './lib/observability/logger.js';
import { registerProcessErrorHandlers } from './lib/errors/registerProcessErrorHandlers.js';
import { validateStartupConfig } from './lib/config/validate.js';
import { getPort } from './lib/config/env.js';
import {
  getOrOpenObservabilityDatabase,
  closeObservabilityDatabase,
} from './lib/persistence/sqlite/observabilityDatabaseSingleton.js';
import { sweepObservabilityRetention } from './lib/persistence/sqlite/retention.js';

validateStartupConfig();
registerProcessErrorHandlers(logger);

const port = getPort();
const shutdownTimeoutMs = 10_000;

/** Periodic retention sweep — avoids trimming on every `record()` call. */
const RETENTION_INTERVAL_MS = 15 * 60 * 1000;
const retentionTimer = setInterval(() => {
  try {
    sweepObservabilityRetention(getOrOpenObservabilityDatabase());
  } catch (error) {
    logger.warn({ error }, 'Observability retention sweep failed');
  }
}, RETENTION_INTERVAL_MS);
retentionTimer.unref();

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
  clearInterval(retentionTimer);

  const forceExitTimer = setTimeout(() => {
    logger.error({ signal, shutdownTimeoutMs }, 'Forced shutdown after timeout');
    process.exit(1);
  }, shutdownTimeoutMs);
  forceExitTimer.unref();

  server.close((error) => {
    clearTimeout(forceExitTimer);

    if (error) {
      logger.error({ error, signal }, 'Failed to close server cleanly');
      closeObservabilityDatabase();
      process.exit(1);
      return;
    }

    logger.info({ signal }, 'Server closed cleanly');
    closeObservabilityDatabase();
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
