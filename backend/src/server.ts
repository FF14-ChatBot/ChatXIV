import 'reflect-metadata';
import type { Server } from 'node:http';
import { logger } from './lib/observability/logger.js';
import { registerProcessErrorHandlers } from './lib/errors/registerProcessErrorHandlers.js';
import { validateStartupConfig } from './lib/config/validate.js';
import { getPort } from './lib/config/env.js';
import { closeAppDatabase } from './lib/persistence/sqlite/appDatabaseSingleton.js';
import { ProcessJobScheduler } from './lib/scheduler/processJobScheduler.js';
import { registerProcessScheduledJobs } from './lib/scheduler/scheduledJobs.js';
import { disposeCache, initializeCache } from './lib/cache/cacheLifecycle.js';
import { register, wireChatKnowledgePipeline } from './lib/di/container.js';

const shutdownTimeoutMs = 10_000;

const jobScheduler = new ProcessJobScheduler(logger);
registerProcessScheduledJobs(jobScheduler);

function closeHttpServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

async function disposeCacheSafe(): Promise<void> {
  try {
    await disposeCache();
  } catch (error) {
    logger.error({ error }, 'Failed to dispose cache during shutdown');
  }
}

async function main(): Promise<void> {
  validateStartupConfig();
  registerProcessErrorHandlers(logger);
  register();

  const port = getPort();

  await initializeCache();
  wireChatKnowledgePipeline();

  const { createApp } = await import('./app.js');
  const app = createApp();

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
        void disposeCacheSafe().finally(() => {
          closeAppDatabase();
          process.exit(1);
        });
      }, closeBudgetMs);
      forceExitTimer.unref();

      let exitCode = 0;
      try {
        await closeHttpServer(server);
      } catch (error) {
        logger.error({ error, signal }, 'Failed to close server cleanly');
        exitCode = 1;
      } finally {
        clearTimeout(forceExitTimer);
        await disposeCacheSafe();
        closeAppDatabase();
        if (exitCode === 0) {
          logger.info({ signal }, 'Server closed cleanly');
        }
        process.exit(exitCode);
      }
    })();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

main().catch((error) => {
  console.error('Fatal: server failed to start', error);
  process.exit(1);
});
