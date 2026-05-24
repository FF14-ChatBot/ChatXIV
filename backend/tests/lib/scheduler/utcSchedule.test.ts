import { describe, it, expect } from 'vitest';
import { getNextRunUtc, ScheduleCadence, UtcDayOfWeek } from '@src/lib/scheduler/utcSchedule.js';

function utc(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
  ms = 0
): Date {
  return new Date(Date.UTC(year, monthIndex, day, hour, minute, second, ms));
}

/** UTC calendar day and wall time for the same day as `ref` (defaults to real now). */
function onUtcDay(ref: Date, hour: number, minute: number, second = 0, ms = 0): Date {
  return utc(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate(), hour, minute, second, ms);
}

describe('getNextRunUtc', () => {
  describe('Daily', () => {
    it('throws when timesUtc is empty', () => {
      const now = onUtcDay(new Date(), 10, 0);
      expect(() => getNextRunUtc(now, { cadence: ScheduleCadence.Daily, timesUtc: [] })).toThrow(
        'Daily schedule requires at least one timesUtc entry'
      );
    });

    it('returns the next slot later the same UTC day when now is before that slot', () => {
      const ref = new Date();
      const now = onUtcDay(ref, 10, 0);
      const next = getNextRunUtc(now, {
        cadence: ScheduleCadence.Daily,
        timesUtc: [{ hour: 14, minute: 30 }],
      });
      expect(next.getTime()).toBe(onUtcDay(ref, 14, 30).getTime());
      expect(next.getTime()).toBeGreaterThan(now.getTime());
    });

    it('rolls to the first slot on the next UTC day when all slots today have passed', () => {
      const ref = new Date();
      const now = onUtcDay(ref, 18, 0);
      const next = getNextRunUtc(now, {
        cadence: ScheduleCadence.Daily,
        timesUtc: [
          { hour: 2, minute: 0 },
          { hour: 14, minute: 0 },
        ],
      });
      const expected = utc(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate() + 1, 2, 0);
      expect(next.getTime()).toBe(expected.getTime());
    });

    it('picks the earliest matching slot when several remain today', () => {
      const ref = new Date();
      const now = onUtcDay(ref, 10, 0);
      const next = getNextRunUtc(now, {
        cadence: ScheduleCadence.Daily,
        timesUtc: [
          { hour: 14, minute: 0 },
          { hour: 12, minute: 0 },
          { hour: 16, minute: 0 },
        ],
      });
      expect(next.getTime()).toBe(onUtcDay(ref, 12, 0).getTime());
    });

    it('dedupes identical clock times', () => {
      const ref = new Date();
      const now = onUtcDay(ref, 10, 0);
      const next = getNextRunUtc(now, {
        cadence: ScheduleCadence.Daily,
        timesUtc: [
          { hour: 12, minute: 0 },
          { hour: 12, minute: 0 },
        ],
      });
      expect(next.getTime()).toBe(onUtcDay(ref, 12, 0).getTime());
    });

    it('orders and matches second-level precision relative to now', () => {
      const ref = new Date();
      const now = onUtcDay(ref, 12, 0, 0, 500);
      const next = getNextRunUtc(now, {
        cadence: ScheduleCadence.Daily,
        timesUtc: [
          { hour: 12, minute: 0, second: 0 },
          { hour: 12, minute: 0, second: 30 },
        ],
      });
      expect(next.getTime()).toBe(onUtcDay(ref, 12, 0, 30).getTime());
    });
  });

  describe('Weekly', () => {
    it('returns the next matching weekday and wall time strictly after now', () => {
      const now = utc(2026, 0, 10, 12, 0);
      const next = getNextRunUtc(now, {
        cadence: ScheduleCadence.Weekly,
        dayOfWeekUtc: UtcDayOfWeek.Sunday,
        timeUtc: { hour: 4, minute: 0 },
      });
      expect(next.getUTCDay()).toBe(UtcDayOfWeek.Sunday);
      expect(next.getUTCHours()).toBe(4);
      expect(next.getUTCMinutes()).toBe(0);
      expect(next.getTime()).toBeGreaterThan(now.getTime());
      expect(next.getTime()).toBe(utc(2026, 0, 11, 4, 0).getTime());
    });

    it('uses the same UTC day when now is earlier than the scheduled wall time', () => {
      const now = utc(2026, 0, 4, 3, 0);
      const next = getNextRunUtc(now, {
        cadence: ScheduleCadence.Weekly,
        dayOfWeekUtc: UtcDayOfWeek.Sunday,
        timeUtc: { hour: 4, minute: 0 },
      });
      expect(next.getTime()).toBe(utc(2026, 0, 4, 4, 0).getTime());
    });

    it('honors optional seconds on timeUtc', () => {
      const now = utc(2026, 0, 4, 3, 0);
      const next = getNextRunUtc(now, {
        cadence: ScheduleCadence.Weekly,
        dayOfWeekUtc: UtcDayOfWeek.Sunday,
        timeUtc: { hour: 4, minute: 0, second: 30 },
      });
      expect(next.getTime()).toBe(utc(2026, 0, 4, 4, 0, 30).getTime());
    });

    it('throws when dayOfWeekUtc is out of range', () => {
      const now = onUtcDay(new Date(), 12, 0);
      expect(() =>
        getNextRunUtc(now, {
          cadence: ScheduleCadence.Weekly,
          dayOfWeekUtc: 7 as UtcDayOfWeek,
          timeUtc: { hour: 4, minute: 0 },
        })
      ).toThrow('dayOfWeekUtc must be 0-6');
    });
  });

  describe('Monthly', () => {
    it('clamps day-of-month when the month is shorter than the configured day', () => {
      const now = utc(2026, 1, 10, 0, 0);
      const next = getNextRunUtc(now, {
        cadence: ScheduleCadence.Monthly,
        dayOfMonthUtc: 31,
        timeUtc: { hour: 5, minute: 15 },
      });
      expect(next.getTime()).toBe(utc(2026, 1, 28, 5, 15).getTime());
    });

    it('rolls from December into the next year', () => {
      const now = utc(2026, 11, 20, 0, 0);
      const next = getNextRunUtc(now, {
        cadence: ScheduleCadence.Monthly,
        dayOfMonthUtc: 15,
        timeUtc: { hour: 12, minute: 0 },
      });
      expect(next.getTime()).toBe(utc(2027, 0, 15, 12, 0).getTime());
    });

    it('throws when dayOfMonthUtc is out of range', () => {
      const now = onUtcDay(new Date(), 12, 0);
      expect(() =>
        getNextRunUtc(now, {
          cadence: ScheduleCadence.Monthly,
          dayOfMonthUtc: 0,
          timeUtc: { hour: 12, minute: 0 },
        })
      ).toThrow('dayOfMonthUtc must be 1-31');
    });
  });
});
