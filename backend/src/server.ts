import 'reflect-metadata';
import { logger } from './lib/observability/logger.js';
import { registerProcessErrorHandlers } from './lib/errors/registerProcessErrorHandlers.js';
import { validateStartupConfig } from './lib/config/validate.js';
import { getPort } from './lib/config/env.js';
import {
  getOrOpenAppDatabase,
  closeAppDatabase,
} from './lib/persistence/sqlite/appDatabaseSingleton.js';
import { RequestMetricsDao } from './lib/persistence/sqlite/dao/RequestMetricsDao.js';
import { UsageRecordsDao } from './lib/persistence/sqlite/dao/UsageRecordsDao.js';
import {
  sweepObservabilityRetention,
  OBSERVABILITY_RETENTION_INTERVAL_MS,
} from './lib/persistence/sqlite/retention.js';
import { disposeCacheSubsystem, initializeCacheSubsystem } from './lib/cache/cacheSubsystem.js';

const shutdownTimeoutMs = 10_000;

async function main(): Promise<void> {
  validateStartupConfig();
  registerProcessErrorHandlers(logger);

  const port = getPort();

  // todo: move into cron job framework
  const retentionTimer = setInterval(() => {
    try {
      const db = getOrOpenAppDatabase();
      sweepObservabilityRetention(new RequestMetricsDao(db), new UsageRecordsDao(db));
    } catch (error) {
      logger.warn({ error }, 'Observability retention sweep failed');
    }
  }, OBSERVABILITY_RETENTION_INTERVAL_MS);
  retentionTimer.unref();

  const { app } = await import('./app.js');
  await initializeCacheSubsystem();

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

    void (async () => {
      const forceExitTimer = setTimeout(() => {
        logger.error({ signal, shutdownTimeoutMs }, 'Forced shutdown after timeout');
        process.exit(1);
      }, shutdownTimeoutMs);
      forceExitTimer.unref();

      try {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => {
            clearTimeout(forceExitTimer);
            if (error) reject(error);
            else resolve();
          });
        });
      } catch (error) {
        logger.error({ error, signal }, 'Failed to close server cleanly');
        await disposeCacheSubsystem();
        closeAppDatabase();
        process.exit(1);
        return;
      }

      await disposeCacheSubsystem();
      closeAppDatabase();
      logger.info({ signal }, 'Server closed cleanly');
      process.exit(0);
    })();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

main().catch((error) => {
  console.error('Fatal: server failed to start', error);
  process.exit(1);
});
