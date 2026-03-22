import { describe, expect, it } from 'vitest';
import { trimNonEmpty } from '@/lib/adsense/trimNonEmpty';

describe('trimNonEmpty', () => {
  it('trims and keeps non-empty strings', () => {
    expect(trimNonEmpty('  x  ')).toBe('x');
  });

  it('returns undefined for blank or non-string', () => {
    expect(trimNonEmpty('   ')).toBeUndefined();
    expect(trimNonEmpty('')).toBeUndefined();
    expect(trimNonEmpty(undefined)).toBeUndefined();
    expect(trimNonEmpty(1)).toBeUndefined();
  });
});
