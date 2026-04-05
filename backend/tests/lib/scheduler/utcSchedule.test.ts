import { describe, it, expect } from 'vitest';
import { getNextRunUtc, ScheduleCadence } from '@src/lib/scheduler/utcSchedule.js';

describe('getNextRunUtc', () => {
  describe('Daily', () => {
    it('throws when timesUtc is empty', () => {
      const now = new Date('2026-06-01T10:00:00.000Z');
      expect(() => getNextRunUtc(now, { cadence: ScheduleCadence.Daily, timesUtc: [] })).toThrow(
        'Daily schedule requires at least one timesUtc entry'
      );
    });
    it('returns the next slot later the same UTC day', () => {
      const now = new Date('2026-06-01T10:00:00.000Z');
      const next = getNextRunUtc(now, {
        cadence: ScheduleCadence.Daily,
        timesUtc: [{ hour: 14, minute: 30 }],
      });
      expect(next.toISOString()).toBe('2026-06-01T14:30:00.000Z');
    });

    it('rolls to the first slot on the next UTC day when all slots passed', () => {
      const now = new Date('2026-06-01T18:00:00.000Z');
      const next = getNextRunUtc(now, {
        cadence: ScheduleCadence.Daily,
        timesUtc: [
          { hour: 2, minute: 0 },
          { hour: 14, minute: 0 },
        ],
      });
      expect(next.toISOString()).toBe('2026-06-02T02:00:00.000Z');
    });

    it('picks the earliest matching slot when several remain today', () => {
      const now = new Date('2026-06-01T10:00:00.000Z');
      const next = getNextRunUtc(now, {
        cadence: ScheduleCadence.Daily,
        timesUtc: [
          { hour: 14, minute: 0 },
          { hour: 12, minute: 0 },
          { hour: 16, minute: 0 },
        ],
      });
      expect(next.toISOString()).toBe('2026-06-01T12:00:00.000Z');
    });

    it('dedupes identical clock times', () => {
      const now = new Date('2026-06-01T10:00:00.000Z');
      const next = getNextRunUtc(now, {
        cadence: ScheduleCadence.Daily,
        timesUtc: [
          { hour: 12, minute: 0 },
          { hour: 12, minute: 0 },
        ],
      });
      expect(next.toISOString()).toBe('2026-06-01T12:00:00.000Z');
    });

    it('orders and matches second-level precision', () => {
      const now = new Date('2026-06-01T12:00:00.500Z');
      const next = getNextRunUtc(now, {
        cadence: ScheduleCadence.Daily,
        timesUtc: [
          { hour: 12, minute: 0, second: 0 },
          { hour: 12, minute: 0, second: 30 },
        ],
      });
      expect(next.toISOString()).toBe('2026-06-01T12:00:30.000Z');
    });
  });

  describe('Weekly', () => {
    it('returns the next matching weekday and wall time from the anchor', () => {
      const anchor = new Date('2026-01-04T04:00:00.000Z');
      const now = new Date('2026-01-10T12:00:00.000Z');
      const next = getNextRunUtc(now, {
        cadence: ScheduleCadence.Weekly,
        anchorUtc: anchor,
      });
      expect(next.toISOString()).toBe('2026-01-11T04:00:00.000Z');
    });

    it('preserves sub-second fields from the anchor', () => {
      const anchor = new Date('2026-01-04T04:00:00.123Z');
      const now = new Date('2026-01-04T03:00:00.000Z');
      const next = getNextRunUtc(now, {
        cadence: ScheduleCadence.Weekly,
        anchorUtc: anchor,
      });
      expect(next.toISOString()).toBe('2026-01-04T04:00:00.123Z');
    });

    it('throws when the anchor is not a valid date', () => {
      const anchor = new Date(Number.NaN);
      const now = new Date('2026-01-01T00:00:00.000Z');
      expect(() =>
        getNextRunUtc(now, { cadence: ScheduleCadence.Weekly, anchorUtc: anchor })
      ).toThrow('nextWeeklyUtc: iteration cap exceeded');
    });
  });

  describe('Monthly', () => {
    it('clamps day-of-month when the month is shorter than the anchor day', () => {
      const anchor = new Date('2026-01-31T05:15:00.000Z');
      const now = new Date('2026-02-10T00:00:00.000Z');
      const next = getNextRunUtc(now, {
        cadence: ScheduleCadence.Monthly,
        anchorUtc: anchor,
      });
      expect(next.toISOString()).toBe('2026-02-28T05:15:00.000Z');
    });

    it('rolls from December into the next year', () => {
      const anchor = new Date('2026-06-15T12:00:00.000Z');
      const now = new Date('2026-12-20T00:00:00.000Z');
      const next = getNextRunUtc(now, {
        cadence: ScheduleCadence.Monthly,
        anchorUtc: anchor,
      });
      expect(next.toISOString()).toBe('2027-01-15T12:00:00.000Z');
    });

    it('throws when the anchor is not a valid date', () => {
      const anchor = new Date(Number.NaN);
      const now = new Date('2026-01-01T00:00:00.000Z');
      expect(() =>
        getNextRunUtc(now, { cadence: ScheduleCadence.Monthly, anchorUtc: anchor })
      ).toThrow('nextMonthlyUtc: iteration cap exceeded');
    });
  });
});
