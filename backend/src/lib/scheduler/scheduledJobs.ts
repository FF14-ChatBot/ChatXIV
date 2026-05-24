import { RequestMetricsDao } from '../persistence/sqlite/dao/RequestMetricsDao.js';
import { UsageRecordsDao } from '../persistence/sqlite/dao/UsageRecordsDao.js';
import { getOrOpenAppDatabase } from '../persistence/sqlite/appDatabaseSingleton.js';
import { sweepObservabilityRetention } from '../persistence/sqlite/retention.js';
import { ScheduleCadence, UtcDayOfWeek } from './utcSchedule.js';
import type { ProcessJobScheduler } from './processJobScheduler.js';

/**
 * Body of the observability retention job. Call directly for adhoc runs (scripts, REPL, future
 * admin route) without going through the scheduler; or use
 * `scheduler.runJobNow('observability-retention-sweep')`.
 */
export function runObservabilityRetentionSweepTask(): void {
  const db = getOrOpenAppDatabase();
  sweepObservabilityRetention(new RequestMetricsDao(db), new UsageRecordsDao(db));
}

/** Register all in-process UTC scheduled jobs on the given scheduler */
export function registerProcessScheduledJobs(scheduler: ProcessJobScheduler): void {
  // Observability retention: weekly Sunday 04:00 UTC.
  scheduler.scheduleUtcJob({
    name: 'observability-retention-sweep',
    schedule: {
      cadence: ScheduleCadence.Weekly,
      dayOfWeekUtc: UtcDayOfWeek.Sunday,
      timeUtc: { hour: 4, minute: 0 },
    },
    task: runObservabilityRetentionSweepTask,
  });
}
