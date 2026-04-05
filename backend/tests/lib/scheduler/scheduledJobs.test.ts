import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type pino from 'pino';

const mocks = vi.hoisted(() => ({
  getOrOpenAppDatabase: vi.fn(() => ({})),
  metricsSweep: vi.fn(),
  usageSweep: vi.fn(),
}));

vi.mock('@src/lib/persistence/sqlite/appDatabaseSingleton.js', () => ({
  getOrOpenAppDatabase: mocks.getOrOpenAppDatabase,
}));

vi.mock('@src/lib/persistence/sqlite/dao/RequestMetricsDao.js', () => ({
  RequestMetricsDao: class {
    constructor(db: unknown) {
      void db;
    }
    sweepToCap(): void {
      mocks.metricsSweep();
    }
  },
}));

vi.mock('@src/lib/persistence/sqlite/dao/UsageRecordsDao.js', () => ({
  UsageRecordsDao: class {
    constructor(db: unknown) {
      void db;
    }
    sweepToCap(): void {
      mocks.usageSweep();
    }
  },
}));

import { ProcessJobScheduler } from '@src/lib/scheduler/processJobScheduler.js';
import { registerProcessScheduledJobs } from '@src/lib/scheduler/scheduledJobs.js';

function createMockLogger(): pino.Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
  } as unknown as pino.Logger;
}

describe('registerProcessScheduledJobs', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.getOrOpenAppDatabase.mockClear();
    mocks.metricsSweep.mockClear();
    mocks.usageSweep.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs observability retention sweep at the next weekly UTC anchor', async () => {
    const log = createMockLogger();
    const scheduler = new ProcessJobScheduler(log, { unrefTimers: false });
    vi.setSystemTime(new Date('2026-01-04T03:00:00.000Z'));

    registerProcessScheduledJobs(scheduler);

    await vi.advanceTimersByTimeAsync(3600_000);

    expect(mocks.getOrOpenAppDatabase).toHaveBeenCalled();
    expect(mocks.metricsSweep).toHaveBeenCalled();
    expect(mocks.usageSweep).toHaveBeenCalled();

    scheduler.dispose();
  });
});
