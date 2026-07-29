import { describe, it, expect } from 'vitest';
import { rankScore } from '@src/lib/knowledge/resolverScoring.js';

describe('lib/knowledge/resolverScoring', () => {
  it('scores rank 0 as 1', () => {
    expect(rankScore(0)).toBe(1);
  });

  it('scores decreasing ranks as strictly decreasing values', () => {
    expect(rankScore(1)).toBe(0.5);
    expect(rankScore(2)).toBeCloseTo(0.333, 3);
    expect(rankScore(0)).toBeGreaterThan(rankScore(1));
    expect(rankScore(1)).toBeGreaterThan(rankScore(2));
  });
});
