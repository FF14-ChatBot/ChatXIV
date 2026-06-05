import 'reflect-metadata';
import type { Server } from 'node:http';
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
import { disposeCache, initializeCache } from './lib/cache/cacheLifecycle.js';

const shutdownTimeoutMs = 10_000;

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
  await initializeCache();

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
        void disposeCacheSafe().finally(() => {
          closeAppDatabase();
          process.exit(1);
        });
      }, shutdownTimeoutMs);
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
