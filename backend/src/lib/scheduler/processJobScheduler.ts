import type pino from 'pino';
import { getNextRunUtc, type UtcJobSchedule } from './utcSchedule.js';

export type ScheduledUtcTask = () => void | Promise<void>;

export type ScheduleUtcJobOptions = Readonly<{
  name: string;
  schedule: UtcJobSchedule;
  task: ScheduledUtcTask;
}>;

export type ProcessJobSchedulerOptions = Readonly<{
  /** When true, timers do not keep the process alive (default true for background maintenance) */
  unrefTimers?: boolean;
}>;

/**
 * Single-process UTC scheduler: arms `setTimeout` to the next calendar instant, runs the task,
 * then recomputes the following fire time. Avoids drift and misalignment from fixed intervals.
 */
export class ProcessJobScheduler {
  private readonly timeoutByJob = new Map<string, NodeJS.Timeout>();
  private readonly unrefTimers: boolean;

  constructor(
    private readonly log: pino.Logger,
    options?: ProcessJobSchedulerOptions
  ) {
    this.unrefTimers = options?.unrefTimers ?? true;
  }

  scheduleUtcJob(options: ScheduleUtcJobOptions): void {
    const { name, schedule, task } = options;

    const arm = (): void => {
      const now = new Date();
      const next = getNextRunUtc(now, schedule);
      const delayMs = Math.max(0, next.getTime() - now.getTime());
      const id = setTimeout(() => {
        void (async () => {
          try {
            await Promise.resolve(task());
            this.log.info({ job: name, ranFor: next.toISOString() }, 'Scheduled job succeeded');
          } catch (error) {
            this.log.warn(
              { error, job: name, scheduledFor: next.toISOString() },
              'Scheduled job failed'
            );
          }
          arm();
        })();
      }, delayMs);
      if (this.unrefTimers) {
        id.unref();
      }
      const prev = this.timeoutByJob.get(name);
      if (prev) {
        clearTimeout(prev);
      }
      this.timeoutByJob.set(name, id);
    };

    arm();
  }

  /** Clears pending timers; does not cancel an already-running task callback */
  dispose(): void {
    for (const id of this.timeoutByJob.values()) {
      clearTimeout(id);
    }
    this.timeoutByJob.clear();
  }
}
