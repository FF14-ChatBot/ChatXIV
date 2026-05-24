import { randomUUID } from 'node:crypto';
import type pino from 'pino';
import { requestContext } from '../request/requestContext.js';
import { getNextRunUtc, type UtcJobSchedule } from './utcSchedule.js';

export const JobTrigger = {
  Scheduled: 'scheduled',
  Manual: 'manual',
} as const;

export type JobTrigger = (typeof JobTrigger)[keyof typeof JobTrigger];

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

type InFlightRun = Readonly<{
  name: string;
  promise: Promise<void>;
}>;

/**
 * Single-process UTC scheduler: arms `setTimeout` to the next calendar instant, runs the task,
 * then recomputes the following fire time. Avoids drift and misalignment from fixed intervals.
 */
export class ProcessJobScheduler {
  private readonly timeoutByJob = new Map<string, NodeJS.Timeout>();
  private readonly tasksByName = new Map<string, ScheduledUtcTask>();
  private readonly inFlight = new Set<InFlightRun>();
  private schedulingStopped = false;
  private readonly unrefTimers: boolean;

  constructor(
    private readonly log: pino.Logger,
    options?: ProcessJobSchedulerOptions
  ) {
    this.unrefTimers = options?.unrefTimers ?? true;
  }

  /**
   * Run a registered job by name once (adhoc / ops). The promise rejects if the task throws after
   * logging; use {@link runObservabilityRetentionSweepTask} etc. for direct calls without the scheduler.
   */
  runJobNow(name: string): Promise<void> {
    const task = this.tasksByName.get(name);
    if (task === undefined) {
      return Promise.reject(new Error(`Unknown scheduled job: ${name}`));
    }
    return this.runTracked(name, new Date(), task, JobTrigger.Manual);
  }

  /**
   * Wait until all in-flight job runs finish or `timeoutMs` elapses. Call after {@link dispose} so
   * no new timer-driven runs start while draining.
   */
  async waitForInFlightJobs(timeoutMs: number): Promise<void> {
    if (this.inFlight.size === 0) {
      return;
    }
    const pending = [...this.inFlight].map((run) => run.promise);
    let timeoutId: NodeJS.Timeout | undefined;
    const onTimeout = new Promise<void>((resolve) => {
      timeoutId = setTimeout(resolve, timeoutMs);
    });
    try {
      await Promise.race([Promise.allSettled(pending), onTimeout]);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
    if (this.inFlight.size > 0) {
      const remainingJobs = [...this.inFlight].map((run) => run.name);
      this.log.warn(
        { remaining: this.inFlight.size, remainingJobs, timeoutMs },
        'Shutdown: in-flight scheduled jobs still running after wait timeout'
      );
    }
  }

  scheduleUtcJob(options: ScheduleUtcJobOptions): void {
    const { name, schedule, task } = options;
    this.tasksByName.set(name, task);

    const arm = (): void => {
      if (this.schedulingStopped) {
        return;
      }
      const now = new Date();
      const next = getNextRunUtc(now, schedule);
      const delayMs = Math.max(0, next.getTime() - now.getTime());
      const id = setTimeout(() => {
        void (async () => {
          await this.runTracked(name, next, task, JobTrigger.Scheduled);
          if (!this.schedulingStopped) {
            arm();
          }
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

  /** Clears pending timers; does not await in-flight work — use {@link waitForInFlightJobs} during shutdown */
  dispose(): void {
    this.schedulingStopped = true;
    for (const id of this.timeoutByJob.values()) {
      clearTimeout(id);
    }
    this.timeoutByJob.clear();
  }

  private runTracked(
    name: string,
    ranFor: Date,
    task: ScheduledUtcTask,
    trigger: JobTrigger
  ): Promise<void> {
    /** Same field as HTTP middleware so every `logger` line in the task carries a correlatable id */
    const requestId = randomUUID();
    const shell = requestContext.run({ requestId }, async (): Promise<void> => {
      try {
        await Promise.resolve(task());
        this.log.info(
          { job: name, ranFor: ranFor.toISOString(), trigger },
          'Scheduled job succeeded'
        );
      } catch (error) {
        this.log.warn(
          { error, job: name, scheduledFor: ranFor.toISOString(), trigger },
          'Scheduled job failed'
        );
        if (trigger === JobTrigger.Manual) {
          throw error;
        }
      }
    });
    const run: InFlightRun = { name, promise: shell };
    this.inFlight.add(run);
    return shell.finally(() => {
      this.inFlight.delete(run);
    });
  }
}
