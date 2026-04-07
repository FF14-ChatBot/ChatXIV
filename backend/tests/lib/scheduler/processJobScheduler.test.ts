import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type pino from 'pino';
import { ProcessJobScheduler, JobTrigger } from '@src/lib/scheduler/processJobScheduler.js';
import { ScheduleCadence } from '@src/lib/scheduler/utcSchedule.js';

function createMockLogger(): pino.Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
  } as unknown as pino.Logger;
}

describe('ProcessJobScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('defaults unrefTimers to true when options are omitted', () => {
    vi.useRealTimers();
    const log = createMockLogger();
    const sample = setTimeout(() => {}, 99_999);
    const timerProto = Object.getPrototypeOf(sample) as { unref: () => unknown };
    clearTimeout(sample);
    const unrefSpy = vi.spyOn(timerProto, 'unref').mockReturnThis();
    vi.setSystemTime(new Date('2026-06-01T10:00:00.000Z'));

    const scheduler = new ProcessJobScheduler(log);
    scheduler.scheduleUtcJob({
      name: 'default-unref',
      schedule: { cadence: ScheduleCadence.Daily, timesUtc: [{ hour: 11, minute: 0 }] },
      task: () => undefined,
    });

    expect(unrefSpy).toHaveBeenCalled();
    scheduler.dispose();
    unrefSpy.mockRestore();
    vi.useFakeTimers();
  });

  it('logs info when a scheduled task succeeds', async () => {
    const log = createMockLogger();
    const scheduler = new ProcessJobScheduler(log, { unrefTimers: false });
    vi.setSystemTime(new Date('2026-06-01T10:00:00.000Z'));

    scheduler.scheduleUtcJob({
      name: 'test-job',
      schedule: { cadence: ScheduleCadence.Daily, timesUtc: [{ hour: 10, minute: 0, second: 1 }] },
      task: () => undefined,
    });

    await vi.advanceTimersByTimeAsync(2000);

    expect(log.info).toHaveBeenCalledWith(
      expect.objectContaining({
        job: 'test-job',
        ranFor: '2026-06-01T10:00:01.000Z',
        trigger: JobTrigger.Scheduled,
      }),
      'Scheduled job succeeded'
    );

    scheduler.dispose();
  });

  it('logs warn when a scheduled task throws', async () => {
    const log = createMockLogger();
    const scheduler = new ProcessJobScheduler(log, { unrefTimers: false });
    vi.setSystemTime(new Date('2026-06-01T10:00:00.000Z'));

    scheduler.scheduleUtcJob({
      name: 'failing-job',
      schedule: { cadence: ScheduleCadence.Daily, timesUtc: [{ hour: 10, minute: 0, second: 1 }] },
      task: () => {
        throw new Error('boom');
      },
    });

    await vi.advanceTimersByTimeAsync(2000);

    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ job: 'failing-job', trigger: JobTrigger.Scheduled }),
      'Scheduled job failed'
    );

    scheduler.dispose();
  });

  it('clears the previous timeout when the same job name is scheduled again', () => {
    const log = createMockLogger();
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const scheduler = new ProcessJobScheduler(log, { unrefTimers: false });
    vi.setSystemTime(new Date('2026-06-01T10:00:00.000Z'));

    scheduler.scheduleUtcJob({
      name: 'dup',
      schedule: { cadence: ScheduleCadence.Daily, timesUtc: [{ hour: 18, minute: 0 }] },
      task: () => undefined,
    });
    scheduler.scheduleUtcJob({
      name: 'dup',
      schedule: { cadence: ScheduleCadence.Daily, timesUtc: [{ hour: 20, minute: 0 }] },
      task: () => undefined,
    });

    expect(clearSpy).toHaveBeenCalled();
    scheduler.dispose();
    clearSpy.mockRestore();
  });

  it('dispose clears pending runs', async () => {
    const log = createMockLogger();
    const scheduler = new ProcessJobScheduler(log, { unrefTimers: false });
    vi.setSystemTime(new Date('2026-06-01T10:00:00.000Z'));
    let runs = 0;

    scheduler.scheduleUtcJob({
      name: 'counted',
      schedule: { cadence: ScheduleCadence.Daily, timesUtc: [{ hour: 10, minute: 0, second: 1 }] },
      task: () => {
        runs += 1;
      },
    });

    await vi.advanceTimersByTimeAsync(2000);
    expect(runs).toBe(1);

    scheduler.dispose();

    await vi.advanceTimersByTimeAsync(86_400_000);
    expect(runs).toBe(1);
  });

  it('waitForInFlightJobs resolves when a slow scheduled task finishes', async () => {
    const log = createMockLogger();
    const scheduler = new ProcessJobScheduler(log, { unrefTimers: false });
    vi.setSystemTime(new Date('2026-06-01T10:00:00.000Z'));
    let resolveTask!: () => void;
    const taskDone = new Promise<void>((r) => {
      resolveTask = r;
    });

    scheduler.scheduleUtcJob({
      name: 'slow',
      schedule: { cadence: ScheduleCadence.Daily, timesUtc: [{ hour: 10, minute: 0, second: 1 }] },
      task: () => taskDone,
    });

    await vi.advanceTimersByTimeAsync(2000);
    scheduler.dispose();

    const waitPromise = scheduler.waitForInFlightJobs(30_000);
    resolveTask();
    await waitPromise;
  });

  it('runJobNow runs the registered task and rejects for unknown names', async () => {
    const log = createMockLogger();
    const scheduler = new ProcessJobScheduler(log, { unrefTimers: false });
    const task = vi.fn();

    scheduler.scheduleUtcJob({
      name: 'adhoc-target',
      schedule: { cadence: ScheduleCadence.Daily, timesUtc: [{ hour: 23, minute: 0 }] },
      task,
    });

    await scheduler.runJobNow('adhoc-target');
    expect(task).toHaveBeenCalledTimes(1);
    expect(log.info).toHaveBeenCalledWith(
      expect.objectContaining({ job: 'adhoc-target', trigger: JobTrigger.Manual }),
      'Scheduled job succeeded'
    );

    await expect(scheduler.runJobNow('missing')).rejects.toThrow('Unknown scheduled job: missing');

    scheduler.dispose();
  });

  it('runJobNow propagates task errors after logging', async () => {
    const log = createMockLogger();
    const scheduler = new ProcessJobScheduler(log, { unrefTimers: false });
    const err = new Error('manual boom');

    scheduler.scheduleUtcJob({
      name: 'bad-manual',
      schedule: { cadence: ScheduleCadence.Daily, timesUtc: [{ hour: 23, minute: 0 }] },
      task: () => {
        throw err;
      },
    });

    await expect(scheduler.runJobNow('bad-manual')).rejects.toThrow('manual boom');
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ job: 'bad-manual', trigger: JobTrigger.Manual }),
      'Scheduled job failed'
    );

    scheduler.dispose();
  });
});
