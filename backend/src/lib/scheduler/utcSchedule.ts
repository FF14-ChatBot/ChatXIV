/**
 * UTC wall-clock schedules for in-process jobs. Uses exact calendar instants instead of fixed
 * intervals so runs align across deploys and are easy to reason about in ops.
 */

export const ScheduleCadence = {
  Daily: 'daily',
  Weekly: 'weekly',
  Monthly: 'monthly',
} as const;

export type ScheduleCadence = (typeof ScheduleCadence)[keyof typeof ScheduleCadence];

/** UTC weekday for weekly schedules (`Date#getUTCDay()` convention: 0 = Sunday … 6 = Saturday) */
export const UtcDayOfWeek = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
} as const;

export type UtcDayOfWeek = (typeof UtcDayOfWeek)[keyof typeof UtcDayOfWeek];

export type UtcTimeOfDay = Readonly<{
  hour: number;
  minute: number;
  second?: number;
}>;

export type UtcJobSchedule =
  | {
      cadence: typeof ScheduleCadence.Daily;
      /** One or more UTC times; the job runs at each every calendar day */
      timesUtc: readonly UtcTimeOfDay[];
    }
  | {
      cadence: typeof ScheduleCadence.Weekly;
      /** UTC weekday (0 = Sunday … 6 = Saturday) */
      dayOfWeekUtc: UtcDayOfWeek;
      timeUtc: UtcTimeOfDay;
    }
  | {
      cadence: typeof ScheduleCadence.Monthly;
      /** Calendar day of month in UTC (1–31; clamped when the month is shorter) */
      dayOfMonthUtc: number;
      timeUtc: UtcTimeOfDay;
    };

function timeOfDayKey(t: UtcTimeOfDay): string {
  const s = t.second ?? 0;
  return `${t.hour}:${t.minute}:${s}`;
}

function normalizeSortedTimes(times: readonly UtcTimeOfDay[]): UtcTimeOfDay[] {
  const map = new Map<string, UtcTimeOfDay>();
  for (const t of times) {
    map.set(timeOfDayKey(t), { hour: t.hour, minute: t.minute, second: t.second ?? 0 });
  }
  return [...map.values()].sort((a, b) => {
    if (a.hour !== b.hour) return a.hour - b.hour;
    if (a.minute !== b.minute) return a.minute - b.minute;
    return (a.second ?? 0) - (b.second ?? 0);
  });
}

function assertUtcDayOfWeek(dayOfWeekUtc: number): void {
  if (!Number.isInteger(dayOfWeekUtc) || dayOfWeekUtc < 0 || dayOfWeekUtc > 6) {
    throw new Error(`dayOfWeekUtc must be 0-6 (Sunday-Saturday), got ${String(dayOfWeekUtc)}`);
  }
}

function assertUtcDayOfMonth(dayOfMonthUtc: number): void {
  if (!Number.isInteger(dayOfMonthUtc) || dayOfMonthUtc < 1 || dayOfMonthUtc > 31) {
    throw new Error(`dayOfMonthUtc must be 1-31, got ${String(dayOfMonthUtc)}`);
  }
}

function nextDailyUtc(now: Date, times: readonly UtcTimeOfDay[]): Date {
  const sorted = normalizeSortedTimes(times);
  if (sorted.length === 0) {
    throw new Error('Daily schedule requires at least one timesUtc entry');
  }
  const nowMs = now.getTime();
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth();
  const d = now.getUTCDate();

  for (const t of sorted) {
    const cand = new Date(Date.UTC(y, mo, d, t.hour, t.minute, t.second ?? 0, 0));
    if (cand.getTime() > nowMs) {
      return cand;
    }
  }
  const t0 = sorted[0];
  return new Date(Date.UTC(y, mo, d + 1, t0.hour, t0.minute, t0.second ?? 0, 0));
}

function nextWeeklyUtc(now: Date, dayOfWeekUtc: number, time: UtcTimeOfDay): Date {
  assertUtcDayOfWeek(dayOfWeekUtc);
  const nowMs = now.getTime();
  const h = time.hour;
  const m = time.minute;
  const s = time.second ?? 0;

  for (let day = 0; day < 14; day++) {
    const base = new Date(nowMs + day * 86_400_000);
    const y = base.getUTCFullYear();
    const mo = base.getUTCMonth();
    const d = base.getUTCDate();
    const cand = new Date(Date.UTC(y, mo, d, h, m, s, 0));
    if (cand.getUTCDay() !== dayOfWeekUtc) {
      continue;
    }
    if (cand.getTime() > nowMs) {
      return cand;
    }
  }
  throw new Error('nextWeeklyUtc: iteration cap exceeded');
}

function clampDayOfMonthUtc(year: number, month: number, desiredDom: number): number {
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Math.min(desiredDom, last);
}

function nextMonthlyUtc(now: Date, dayOfMonthUtc: number, time: UtcTimeOfDay): Date {
  assertUtcDayOfMonth(dayOfMonthUtc);
  const nowMs = now.getTime();
  const h = time.hour;
  const m = time.minute;
  const s = time.second ?? 0;

  let y = now.getUTCFullYear();
  let mo = now.getUTCMonth();

  for (let i = 0; i < 600; i++) {
    const dom = clampDayOfMonthUtc(y, mo, dayOfMonthUtc);
    const cand = new Date(Date.UTC(y, mo, dom, h, m, s, 0));
    if (cand.getTime() > nowMs) {
      return cand;
    }
    mo += 1;
    if (mo > 11) {
      mo = 0;
      y += 1;
    }
  }
  throw new Error('nextMonthlyUtc: iteration cap exceeded');
}

/** Next strictly future UTC instant matching the schedule (relative to `now`). */
export function getNextRunUtc(now: Date, schedule: UtcJobSchedule): Date {
  switch (schedule.cadence) {
    case ScheduleCadence.Daily:
      return nextDailyUtc(now, schedule.timesUtc);
    case ScheduleCadence.Weekly:
      return nextWeeklyUtc(now, schedule.dayOfWeekUtc, schedule.timeUtc);
    case ScheduleCadence.Monthly:
      return nextMonthlyUtc(now, schedule.dayOfMonthUtc, schedule.timeUtc);
  }
}
