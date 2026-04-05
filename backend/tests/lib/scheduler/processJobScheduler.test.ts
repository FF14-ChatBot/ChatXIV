import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ProcessJobScheduler,
  createProcessJobScheduler,
} from '../../../src/lib/scheduler/processJobScheduler.js';

describe('lib/scheduler/processJobScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('createProcessJobScheduler returns a scheduler instance', () => {
    const warn = vi.fn();
    const scheduler = createProcessJobScheduler({ warn });
    expect(scheduler).toBeInstanceOf(ProcessJobScheduler);
  });

  it('calls unref on the timer when unrefTimer is omitted (default)', () => {
    const warn = vi.fn();
    const task = vi.fn();
    const unref = vi.fn();
    const fakeHandle = { unref } as unknown as ReturnType<typeof setInterval>;
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval').mockReturnValue(fakeHandle);

    const scheduler = new ProcessJobScheduler({ warn });
    scheduler.schedulePeriodic({ name: 't', intervalMs: 60_000, task });

    expect(unref).toHaveBeenCalledTimes(1);
    setIntervalSpy.mockRestore();
    scheduler.stopAll();
  });

  it('runs the task on each interval', () => {
    const warn = vi.fn();
    const task = vi.fn();
    const scheduler = new ProcessJobScheduler({ warn });

    scheduler.schedulePeriodic({ name: 't', intervalMs: 1_000, task, unrefTimer: false });

    expect(task).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(task).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1_000);
    expect(task).toHaveBeenCalledTimes(2);
    scheduler.stopAll();
  });

  it('stopAll clears timers so the task does not run again', () => {
    const warn = vi.fn();
    const task = vi.fn();
    const scheduler = new ProcessJobScheduler({ warn });

    scheduler.schedulePeriodic({ name: 't', intervalMs: 500, task, unrefTimer: false });
    vi.advanceTimersByTime(500);
    expect(task).toHaveBeenCalledTimes(1);

    scheduler.stopAll();
    vi.advanceTimersByTime(5_000);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('logs when a synchronous task throws', () => {
    const warn = vi.fn();
    const error = new Error('boom');
    const scheduler = new ProcessJobScheduler({ warn });

    scheduler.schedulePeriodic({
      name: 'bad-sync',
      intervalMs: 100,
      task: () => {
        throw error;
      },
      unrefTimer: false,
    });

    vi.advanceTimersByTime(100);
    expect(warn).toHaveBeenCalledWith({ error, job: 'bad-sync' }, 'Scheduled job failed');
    scheduler.stopAll();
  });

  it('logs when an async task rejects', async () => {
    const warn = vi.fn();
    const error = new Error('async boom');
    const scheduler = new ProcessJobScheduler({ warn });

    scheduler.schedulePeriodic({
      name: 'bad-async',
      intervalMs: 100,
      task: async () => {
        throw error;
      },
      unrefTimer: false,
    });

    vi.advanceTimersByTime(100);
    await Promise.resolve();
    await Promise.resolve();
    expect(warn).toHaveBeenCalledWith({ error, job: 'bad-async' }, 'Scheduled job failed');
    scheduler.stopAll();
  });
});
