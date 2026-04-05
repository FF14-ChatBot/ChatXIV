import type { Logger } from 'pino';

export type PeriodicJobConfig = {
  readonly name: string;
  readonly intervalMs: number;
  readonly task: () => void | Promise<void>;
  /**
   * When true (default), the timer does not keep the Node process alive on its own.
   * Match Node’s `Timeout#unref()` behavior for background maintenance work.
   */
  readonly unrefTimer?: boolean;
};

type SchedulerLogger = Pick<Logger, 'warn'>;

function isThenable(value: unknown): value is Promise<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as Promise<unknown>).then === 'function'
  );
}

/**
 * In-process periodic jobs (setInterval-based). For maintenance tasks co-located with the API server.
 * Stops all timers on {@link ProcessJobScheduler.stopAll} (e.g. graceful shutdown).
 */
export class ProcessJobScheduler {
  private readonly timers: NodeJS.Timeout[] = [];

  constructor(private readonly log: SchedulerLogger) {}

  schedulePeriodic(job: PeriodicJobConfig): void {
    const { name, intervalMs, task, unrefTimer = true } = job;

    const runTick = (): void => {
      try {
        const result = task();
        if (isThenable(result)) {
          void result.catch((error: unknown) => {
            this.log.warn({ error, job: name }, 'Scheduled job failed');
          });
        }
      } catch (error) {
        this.log.warn({ error, job: name }, 'Scheduled job failed');
      }
    };

    const timer = setInterval(runTick, intervalMs);
    if (unrefTimer) {
      timer.unref();
    }
    this.timers.push(timer);
  }

  stopAll(): void {
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers.length = 0;
  }
}

export function createProcessJobScheduler(log: SchedulerLogger): ProcessJobScheduler {
  return new ProcessJobScheduler(log);
}
