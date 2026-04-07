import 'reflect-metadata';
import { app } from './app.js';
import { logger } from './lib/observability/logger.js';
import { registerProcessErrorHandlers } from './lib/errors/registerProcessErrorHandlers.js';
import { validateStartupConfig } from './lib/config/validate.js';
import { getPort } from './lib/config/env.js';
import { closeAppDatabase } from './lib/persistence/sqlite/appDatabaseSingleton.js';
import { ProcessJobScheduler } from './lib/scheduler/processJobScheduler.js';
import { registerProcessScheduledJobs } from './lib/scheduler/scheduledJobs.js';

validateStartupConfig();
registerProcessErrorHandlers(logger);

const port = getPort();
const shutdownTimeoutMs = 10_000;

const jobScheduler = new ProcessJobScheduler(logger);
registerProcessScheduledJobs(jobScheduler);

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
  jobScheduler.dispose();

  const shutdownStartedAt = Date.now();

  void (async () => {
    try {
      await jobScheduler.waitForInFlightJobs(shutdownTimeoutMs);
    } catch (error) {
      logger.warn({ error, signal }, 'Error while waiting for in-flight scheduled jobs');
    }

    const elapsed = Date.now() - shutdownStartedAt;
    const closeBudgetMs = Math.max(1_000, shutdownTimeoutMs - elapsed);

    const forceExitTimer = setTimeout(() => {
      logger.error({ signal, shutdownTimeoutMs, closeBudgetMs }, 'Forced shutdown after timeout');
      process.exit(1);
    }, closeBudgetMs);
    forceExitTimer.unref();

    server.close((error) => {
      clearTimeout(forceExitTimer);

      if (error) {
        logger.error({ error, signal }, 'Failed to close server cleanly');
        closeAppDatabase();
        process.exit(1);
        return;
      }

      logger.info({ signal }, 'Server closed cleanly');
      closeAppDatabase();
      process.exit(0);
    });
  })();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
