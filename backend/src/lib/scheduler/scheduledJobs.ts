import { RequestMetricsDao } from '../persistence/sqlite/dao/RequestMetricsDao.js';
import { UsageRecordsDao } from '../persistence/sqlite/dao/UsageRecordsDao.js';
import { getOrOpenAppDatabase } from '../persistence/sqlite/appDatabaseSingleton.js';
import { sweepObservabilityRetention } from '../persistence/sqlite/retention.js';
import { ScheduleCadence } from './utcSchedule.js';
import type { ProcessJobScheduler } from './processJobScheduler.js';

/**
 * Weekly UTC anchor for observability retention sweeps. Any instant on the desired weekday/time
 * works; cadence is derived from its UTC weekday and clock time.
 */
export const OBSERVABILITY_RETENTION_WEEKLY_ANCHOR_UTC = new Date('2026-01-04T04:00:00.000Z');

/** Register all in-process UTC scheduled jobs on the given scheduler */
export function registerProcessScheduledJobs(scheduler: ProcessJobScheduler): void {
  scheduler.scheduleUtcJob({
    name: 'observability-retention-sweep',
    schedule: {
      cadence: ScheduleCadence.Weekly,
      anchorUtc: OBSERVABILITY_RETENTION_WEEKLY_ANCHOR_UTC,
    },
    task: () => {
      const db = getOrOpenAppDatabase();
      sweepObservabilityRetention(new RequestMetricsDao(db), new UsageRecordsDao(db));
    },
  });
}
