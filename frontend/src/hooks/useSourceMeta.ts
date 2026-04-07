import { useMemo } from 'react';
import type { SourceCitation } from '@chatxiv/cdm';

export interface SourceDisplayItem {
  readonly label: string;
  readonly url?: string;
  readonly patchOrDate?: string;
}

export function useSourceMeta(
  sources: readonly SourceCitation[] | undefined
): readonly SourceDisplayItem[] {
  return useMemo(() => {
    if (!sources || sources.length === 0) return [];
    return sources.map((s) => ({
      label: s.sourceName,
      url: s.sourceUrl,
      patchOrDate: s.patchOrDate ?? s.lastUpdated,
    }));
  }, [sources]);
}
