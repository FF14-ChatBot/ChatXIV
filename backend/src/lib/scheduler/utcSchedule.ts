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
      /** Same UTC weekday and time-of-day as this instant, repeating every week */
      anchorUtc: Date;
    }
  | {
      cadence: typeof ScheduleCadence.Monthly;
      /** Same UTC calendar day (clamped) and time-of-day as this instant, repeating each month */
      anchorUtc: Date;
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

function nextWeeklyUtc(now: Date, anchor: Date): Date {
  const nowMs = now.getTime();
  const targetDow = anchor.getUTCDay();
  const h = anchor.getUTCHours();
  const m = anchor.getUTCMinutes();
  const s = anchor.getUTCSeconds();
  const ms = anchor.getUTCMilliseconds();

  for (let day = 0; day < 14; day++) {
    const base = new Date(nowMs + day * 86_400_000);
    const y = base.getUTCFullYear();
    const mo = base.getUTCMonth();
    const d = base.getUTCDate();
    const cand = new Date(Date.UTC(y, mo, d, h, m, s, ms));
    if (cand.getUTCDay() !== targetDow) {
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

function nextMonthlyUtc(now: Date, anchor: Date): Date {
  const nowMs = now.getTime();
  const desiredDom = anchor.getUTCDate();
  const h = anchor.getUTCHours();
  const m = anchor.getUTCMinutes();
  const s = anchor.getUTCSeconds();
  const ms = anchor.getUTCMilliseconds();

  let y = now.getUTCFullYear();
  let mo = now.getUTCMonth();

  for (let i = 0; i < 600; i++) {
    const dom = clampDayOfMonthUtc(y, mo, desiredDom);
    const cand = new Date(Date.UTC(y, mo, dom, h, m, s, ms));
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
      return nextWeeklyUtc(now, schedule.anchorUtc);
    case ScheduleCadence.Monthly:
      return nextMonthlyUtc(now, schedule.anchorUtc);
  }
}
