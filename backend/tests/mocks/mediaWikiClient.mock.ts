import { vi, type Mocked } from 'vitest';
import type { MediaWikiClient } from '@src/lib/mediawiki/types.js';

export function createMockMediaWikiClient(): Mocked<MediaWikiClient> {
  return {
    query: vi.fn().mockResolvedValue({ query: {} }),
    parse: vi.fn().mockResolvedValue({ parse: {} }),
    search: vi.fn().mockResolvedValue({ query: { search: [] } }),
  };
}
