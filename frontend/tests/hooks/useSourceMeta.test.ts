import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSourceMeta } from '@/hooks/useSourceMeta';
import type { SourceCitation } from '@chatxiv/cdm';

describe('useSourceMeta', () => {
  it('returns empty array when sources is undefined', () => {
    const { result } = renderHook(() => useSourceMeta(undefined));
    expect(result.current).toEqual([]);
  });

  it('returns empty array when sources is empty', () => {
    const { result } = renderHook(() => useSourceMeta([]));
    expect(result.current).toEqual([]);
  });

  it('maps sourceName to label and sourceUrl to url', () => {
    const sources: SourceCitation[] = [
      { sourceName: 'Wiki', sourceUrl: 'https://wiki.example.com' },
    ];
    const { result } = renderHook(() => useSourceMeta(sources));
    expect(result.current).toEqual([
      { label: 'Wiki', url: 'https://wiki.example.com', patchOrDate: undefined },
    ]);
  });

  it('prefers patchOrDate over lastUpdated', () => {
    const sources: SourceCitation[] = [
      { sourceName: 'Guide', patchOrDate: 'Patch 7.1', lastUpdated: '2025-01-01' },
    ];
    const { result } = renderHook(() => useSourceMeta(sources));
    expect(result.current[0]?.patchOrDate).toBe('Patch 7.1');
  });

  it('falls back to lastUpdated when patchOrDate is absent', () => {
    const sources: SourceCitation[] = [{ sourceName: 'API', lastUpdated: '2025-06-15' }];
    const { result } = renderHook(() => useSourceMeta(sources));
    expect(result.current[0]?.patchOrDate).toBe('2025-06-15');
  });

  it('handles minimal sources with only sourceName', () => {
    const sources: SourceCitation[] = [{ sourceName: 'XIVAPI' }];
    const { result } = renderHook(() => useSourceMeta(sources));
    expect(result.current).toEqual([{ label: 'XIVAPI', url: undefined, patchOrDate: undefined }]);
  });

  it('maps multiple sources correctly', () => {
    const sources: SourceCitation[] = [
      {
        sourceName: 'Lodestone',
        sourceUrl: 'https://lodestone.example.com',
        patchOrDate: 'Patch 7.0',
      },
      { sourceName: 'XIVAPI' },
      { sourceName: 'The Balance', lastUpdated: '2025-03-10' },
    ];
    const { result } = renderHook(() => useSourceMeta(sources));
    expect(result.current).toHaveLength(3);
    expect(result.current[0]?.label).toBe('Lodestone');
    expect(result.current[1]?.url).toBeUndefined();
    expect(result.current[2]?.patchOrDate).toBe('2025-03-10');
  });
});
