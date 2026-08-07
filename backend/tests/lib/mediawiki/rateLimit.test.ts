import { describe, it, expect, vi } from 'vitest';
import { createMediaWikiRateLimiter } from '@src/lib/mediawiki/rateLimit.js';
import { MediaWikiWikiId } from '@src/lib/config/constants.js';

describe('lib/mediawiki/rateLimit', () => {
  it('returns the same bucket instance for repeated calls to the same wiki', () => {
    const limiter = createMediaWikiRateLimiter(1);
    const first = limiter.forWiki(MediaWikiWikiId.ConsoleGamesWiki);
    const second = limiter.forWiki(MediaWikiWikiId.ConsoleGamesWiki);
    expect(first).toBe(second);
  });

  it('returns independent buckets per wiki', () => {
    const limiter = createMediaWikiRateLimiter(1);
    const cgw = limiter.forWiki(MediaWikiWikiId.ConsoleGamesWiki);
    const fandom = limiter.forWiki(MediaWikiWikiId.FandomFfxiv);
    expect(cgw).not.toBe(fandom);
  });

  it("threads maxQueueWaitMs through to each wiki's bucket (DEV-59)", async () => {
    vi.useFakeTimers();
    try {
      const limiter = createMediaWikiRateLimiter(1, undefined, 300);
      const cgw = limiter.forWiki(MediaWikiWikiId.ConsoleGamesWiki);
      await cgw.consume(); // takes the only token; refill is 1000ms out

      let rejected: unknown;
      const pending = cgw.consume().catch((err: unknown) => {
        rejected = err;
      });

      await vi.advanceTimersByTimeAsync(300);
      await pending;
      expect(rejected).toBeInstanceOf(Error);
      expect((rejected as Error).message).toContain('300ms');
    } finally {
      vi.useRealTimers();
    }
  });

  it('exhausting one wiki bucket does not affect another wiki', async () => {
    vi.useFakeTimers();
    try {
      const limiter = createMediaWikiRateLimiter(1);
      const cgw = limiter.forWiki(MediaWikiWikiId.ConsoleGamesWiki);
      const fandom = limiter.forWiki(MediaWikiWikiId.FandomFfxiv);

      await cgw.consume();

      let cgwResolved = false;
      const pending = cgw.consume().then(() => {
        cgwResolved = true;
      });
      expect(cgwResolved).toBe(false);

      await expect(fandom.consume()).resolves.toBeUndefined();

      await vi.advanceTimersByTimeAsync(1_000);
      await pending;
      expect(cgwResolved).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
