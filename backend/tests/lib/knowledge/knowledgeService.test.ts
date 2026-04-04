import { describe, it, expect, vi, afterEach } from 'vitest';
import { UsageCategory } from '@chatxiv/cdm';
import { logger } from '@src/lib/observability/logger.js';
import { createKnowledgeService } from '@src/lib/knowledge/knowledgeService.js';
import type { SourceResolver } from '@src/lib/knowledge/types.js';

describe('createKnowledgeService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty chunks when no resolvers are registered', async () => {
    const svc = createKnowledgeService([]);
    const result = await svc.retrieve('q');
    expect(result.chunks).toEqual([]);
  });

  it('merges and sorts chunks by score across resolvers', async () => {
    const r1: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async () => [{ text: 'low', source: { sourceName: 'A' }, score: 1 }],
    };
    const r2: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async () => [{ text: 'high', source: { sourceName: 'B' }, score: 10 }],
    };
    const svc = createKnowledgeService([r1, r2]);
    const result = await svc.retrieve('fight', { category: UsageCategory.RAIDING, topK: 8 });
    expect(result.chunks.map((c) => c.text)).toEqual(['high', 'low']);
  });

  it('uses all resolvers when category is uncategorized', async () => {
    const r1: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async () => [{ text: 'a', source: { sourceName: 'x' } }],
    };
    const r2: SourceResolver = {
      supportedCategories: [UsageCategory.MSQ],
      resolve: async () => [{ text: 'b', source: { sourceName: 'y' } }],
    };
    const svc = createKnowledgeService([r1, r2]);
    const result = await svc.retrieve('q', { category: UsageCategory.UNCATEGORIZED });
    expect(result.chunks.length).toBe(2);
  });

  it('ignores failed resolvers and keeps fulfilled results', async () => {
    const warn = vi.spyOn(logger, 'warn');
    const bad: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async () => {
        throw new Error('boom');
      },
    };
    const good: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async () => [{ text: 'ok', source: { sourceName: 'g' } }],
    };
    const svc = createKnowledgeService([bad, good]);
    const result = await svc.retrieve('q', { category: UsageCategory.RAIDING });
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].text).toBe('ok');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('falls back to all resolvers when category has no dedicated mapping', async () => {
    const msqOnly: SourceResolver = {
      supportedCategories: [UsageCategory.MSQ],
      resolve: async () => [{ text: 'msq', source: { sourceName: 'm' } }],
    };
    const svc = createKnowledgeService([msqOnly]);
    const result = await svc.retrieve('q', { category: UsageCategory.RAIDING });
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].text).toBe('msq');
  });

  it('returns empty chunks when synchronous resolve throws', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {
      /* noop */
    });
    const bad: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: () => {
        throw new Error('sync boom');
      },
    };
    const svc = createKnowledgeService([bad]);
    const result = await svc.retrieve('q', { category: UsageCategory.RAIDING });
    expect(result.chunks).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('treats missing scores as zero when sorting', async () => {
    const r: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async () => [
        { text: 'no-score', source: { sourceName: 'a' } },
        { text: 'scored', source: { sourceName: 'b' }, score: 1 },
      ],
    };
    const svc = createKnowledgeService([r]);
    const result = await svc.retrieve('q', { category: UsageCategory.RAIDING, topK: 8 });
    expect(result.chunks.map((c) => c.text)).toEqual(['scored', 'no-score']);
  });

  it('drops results when retrieval budget aborts before resolve', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {
      /* noop */
    });
    const slow: SourceResolver = {
      supportedCategories: [UsageCategory.RAIDING],
      resolve: async () =>
        new Promise((resolve) => {
          setTimeout(() => resolve([{ text: 'late', source: { sourceName: 's' } }]), 10_000);
        }),
    };
    const svc = createKnowledgeService([slow]);
    const retrievePromise = svc.retrieve('q', { category: UsageCategory.RAIDING });
    await vi.advanceTimersByTimeAsync(6_001);
    const result = await retrievePromise;
    expect(result.chunks).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
