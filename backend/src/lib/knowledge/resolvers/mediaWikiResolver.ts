/**
 * Resolves UNLOCKS-category queries against MediaWiki (ConsoleGamesWiki, falling back to
 * Fandom FFXIV) by searching for candidate pages, fetching their full rendered content, and
 * extracting cleaned, bounded chunks of article text.
 *
 * Deliberately a deterministic extraction heuristic (strip structural HTML, cap length) rather
 * than semantic relevance filtering -- that's the LLM's job downstream once it exists (DEV-50).
 */
import type pino from 'pino';
import type { UsageCategory } from '@chatxiv/cdm';
import {
  CACHE_STALE_GRACE_SECONDS,
  CACHE_TTL_MEDIAWIKI_SEARCH_SECONDS,
  MEDIAWIKI_DATA_SOURCE,
  MediaWikiWikiId,
} from '../../config/constants.js';
import { AppError } from '../../errors/AppError.js';
import { mediaWikiSearchCacheKey } from '../../cache/cacheCategoryKeys.js';
import { getOrFetch } from '../../getOrFetch.js';
import type { CacheClient } from '../../cache/types.js';
import type {
  MediaWikiApiResponse,
  MediaWikiClient,
  MediaWikiSearchResultEntry,
} from '../../mediawiki/types.js';
import type { ResolveOptions, RetrievedChunk, SourceResolver } from '../types.js';
import { rankScore } from '../resolverScoring.js';

/**
 * Cap on how many search hits get a follow-up `parse()` call (bounds latency + rate-limit use).
 * With the default 1 req/s per-wiki rate limit, each additional page adds ~1s of queueing before
 * its parse() call even starts; kept at 2 (not 3) so ConsoleGamesWiki-then-Fandom-fallback's
 * worst case comfortably fits inside knowledgeService's shared 6s retrieval timeout.
 */
const MAX_PAGES_TO_PARSE = 2;
/** Truncation ceiling per chunk; cut at the last whitespace at/before this limit. */
const MAX_CHUNK_CHARS = 1500;
/** A parsed-and-cleaned page shorter than this counts as "insufficient" content. */
const MIN_CONTENT_CHARS = 80;
/** Fallback search limit when a caller doesn't supply `options.topK`. */
const DEFAULT_SEARCH_LIMIT = 8;
/**
 * Ceiling on how much of the raw user message becomes the MediaWiki `srsearch` term. The chat
 * message can be up to 12,000 characters (`CHAT_MAX_USER_MESSAGE_CHARS`); passed through
 * unbounded, that goes straight into a GET request's query string, which most web
 * servers/proxies reject well before that length. Search queries don't benefit from thousands
 * of characters anyway, so this is a genuine bound, not just a defensive truncation.
 */
const MAX_SEARCH_QUERY_CHARS = 300;

/**
 * Appended to the search term only when falling back to the Fandom wiki (never ConsoleGamesWiki,
 * which is already FFXIV-only). Fandom's `finalfantasy.fandom.com` spans every mainline Final
 * Fantasy title and spinoff, and its relevance ranking has no notion of "this game specifically"
 * -- confirmed live that a query like "Ninja" ranks FFXIV's own job page below FFXI's and
 * Stranger of Paradise's same-named pages. Appending this term as a relevance boost (not a hard
 * filter -- CirrusSearch has no reliable exact-category match for this wiki's actual category
 * names) reliably surfaces the FFXIV page first without risking zero results.
 */
const FANDOM_FFXIV_SEARCH_BOOST = 'Final Fantasy XIV' as const;

const HTML_ENTITIES: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
};

function decodeHtmlEntities(text: string): string {
  return text.replace(
    /&(amp|quot|#39|apos|lt|gt|nbsp);/g,
    (match) => HTML_ENTITIES[match] ?? match
  );
}

const TABLE_TAG_PATTERN = /<table\b[^>]*>|<\/table\s*>/gi;

/**
 * Infoboxes/navboxes are almost always rendered as `<table>` -- drop them before stripping tags.
 * Tracks nesting depth rather than a single non-greedy regex match: a naive
 * `/<table[\s\S]*?<\/table>/` stops at the FIRST `</table>` it finds, which for a table nested
 * inside another table is the inner table's close, not the outer one -- leaking the outer
 * table's own label/value text (exactly the infobox content this is meant to drop) into the
 * output. Depth-tracking only emits content while outside of any table, regardless of nesting.
 *
 * A self-closing `<table/>` doesn't open a scope (there's no content to strip), so it's treated
 * as depth-neutral rather than an unmatched open -- otherwise `depth` would never return to 0 and
 * every real chunk of the article after that tag would be silently discarded. If the markup is
 * still unbalanced when the scan ends (a genuinely unclosed table, e.g. from truncated/malformed
 * parse output), the remaining text is appended anyway: leaking some table markup for `stripTags`
 * to clean up next is a far smaller cost than dropping the rest of a real article.
 */
function stripTables(html: string): string {
  let depth = 0;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  TABLE_TAG_PATTERN.lastIndex = 0;
  while ((match = TABLE_TAG_PATTERN.exec(html)) !== null) {
    if (depth === 0) {
      result += html.slice(lastIndex, match.index);
    }
    const isClosingTag = match[0].startsWith('</');
    const isSelfClosing = !isClosingTag && match[0].endsWith('/>');
    if (!isSelfClosing) {
      depth = isClosingTag ? Math.max(0, depth - 1) : depth + 1;
    }
    lastIndex = TABLE_TAG_PATTERN.lastIndex;
  }
  result += html.slice(lastIndex);
  return result;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ');
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Truncates at the last whitespace at/before `maxChars` so chunks don't end mid-word. */
function truncateAtWordBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim();
}

function cleanPageContent(html: string): string {
  return truncateAtWordBoundary(
    collapseWhitespace(decodeHtmlEntities(stripTags(stripTables(html)))),
    MAX_CHUNK_CHARS
  );
}

/**
 * `action=parse` response shape is generic (`MediaWikiApiResponse`); narrow defensively rather
 * than asserting, since the type intentionally makes no promise about its contents.
 */
function extractParseHtml(response: MediaWikiApiResponse): string | undefined {
  const parse = response.parse;
  if (typeof parse !== 'object' || parse === null) return undefined;
  const text = (parse as Record<string, unknown>).text;
  if (typeof text !== 'object' || text === null) return undefined;
  const html = (text as Record<string, unknown>)['*'];
  return typeof html === 'string' ? html : undefined;
}

/**
 * `index.php?title=` works regardless of a wiki's short-URL/rewrite configuration, unlike
 * guessing at a `/wiki/Title` path -- both CGW and Fandom serve `index.php` next to `api.php`.
 * Trailing slash(es) on `apiBaseUrl` are dropped before swapping the last path segment, so a
 * trailing-slash env-var override (e.g. `MEDIAWIKI_CGW_URL=.../api.php/`) doesn't produce
 * `.../api.php/index.php` (a 404) instead of `.../index.php`.
 */
function buildArticleUrl(apiBaseUrl: string, title: string): string {
  const url = new URL(apiBaseUrl);
  const pathnameWithoutTrailingSlash = url.pathname.replace(/\/+$/, '');
  url.pathname = pathnameWithoutTrailingSlash.replace(/\/[^/]*$/, '/index.php');
  url.search = '';
  url.searchParams.set('title', title);
  return url.toString();
}

async function parseCandidate(
  client: MediaWikiClient,
  wikiId: MediaWikiWikiId,
  baseUrl: string,
  entry: MediaWikiSearchResultEntry,
  /** Position in the wiki's own search-relevance ranking (0 = best match). */
  rank: number,
  signal: AbortSignal | undefined,
  onQueueWait: ((waitedMs: number) => void) | undefined
): Promise<RetrievedChunk | undefined> {
  const response = await client.parse(wikiId, { page: entry.title }, signal, onQueueWait);
  const html = extractParseHtml(response);
  if (html === undefined) return undefined;

  const text = cleanPageContent(html);
  if (text.length < MIN_CONTENT_CHARS) return undefined;

  return {
    text,
    source: {
      sourceName: entry.title,
      sourceUrl: buildArticleUrl(baseUrl, entry.title),
      lastUpdated: entry.timestamp,
    },
    // MediaWiki's Action API doesn't return a numeric relevance score, but search results are
    // already returned in the wiki's own relevance order -- use that rank so these chunks don't
    // silently sort to the bottom (behind score: 0) once merged with a resolver that does score.
    score: rankScore(rank),
  };
}

/** Search + parse + clean, uncached. Wrapped by {@link resolveForWiki} below. */
async function fetchWikiChunks(
  client: MediaWikiClient,
  wikiId: MediaWikiWikiId,
  baseUrl: string,
  query: string,
  topK: number,
  log: pino.Logger,
  signal: AbortSignal | undefined,
  onQueueWait: ((waitedMs: number) => void) | undefined
): Promise<readonly RetrievedChunk[]> {
  const searchResponse = await client.search(wikiId, query, topK, signal, onQueueWait);
  const candidates = searchResponse.query.search.slice(0, MAX_PAGES_TO_PARSE);
  if (candidates.length === 0) return [];

  const settled = await Promise.allSettled(
    candidates.map((entry, rank) =>
      parseCandidate(client, wikiId, baseUrl, entry, rank, signal, onQueueWait)
    )
  );

  const chunks: RetrievedChunk[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      if (result.value !== undefined) chunks.push(result.value);
    } else {
      log.warn({ err: result.reason, wikiId }, 'MediaWiki parse failed for a candidate page');
    }
  }
  return chunks;
}

/** Cached payload shape: unlike XIVAPI's single shared citation, each MediaWiki chunk carries
 * its own per-page citation already, so the cache just wraps the chunk array with a fetch
 * timestamp for TR-9 stale-grace bookkeeping. */
type CachedWikiChunks = Readonly<{
  chunks: readonly RetrievedChunk[];
  fetchedAt: string;
}>;

/**
 * Cache-aside wrapper around {@link fetchWikiChunks}, keyed per (wiki, query). Wiki guide content
 * changes far less often than XIVAPI's structured data, so without this every repeated question
 * re-issues a live search + up to `MAX_PAGES_TO_PARSE` parse calls against a 1 req/s-throttled
 * wiki, even for the exact same query moments apart.
 */
async function resolveForWiki(
  client: MediaWikiClient,
  cache: CacheClient,
  wikiId: MediaWikiWikiId,
  baseUrl: string,
  query: string,
  topK: number,
  log: pino.Logger,
  signal: AbortSignal | undefined,
  onQueueWait: ((waitedMs: number) => void) | undefined
): Promise<readonly RetrievedChunk[]> {
  // At most MAX_PAGES_TO_PARSE candidates are ever parsed regardless of topK (see
  // fetchWikiChunks), so that's the search limit that actually determines the result -- both
  // the outbound search request and the cache key use this clamped value, not the raw topK, so
  // two callers that only differ in an unused portion of topK share one cache entry instead of
  // one silently overwriting the other's differently-sized result for the full TTL.
  const searchLimit = Math.min(topK, MAX_PAGES_TO_PARSE);

  const { value, stale } = await getOrFetch<CachedWikiChunks>({
    cache,
    key: mediaWikiSearchCacheKey({ wikiId, query, limit: searchLimit }),
    ttlSeconds: CACHE_TTL_MEDIAWIKI_SEARCH_SECONDS,
    staleGraceSeconds: CACHE_STALE_GRACE_SECONDS,
    dataSource: MEDIAWIKI_DATA_SOURCE,
    getFetchedAt: (payload) => payload.fetchedAt,
    fetch: async () => ({
      chunks: await fetchWikiChunks(
        client,
        wikiId,
        baseUrl,
        query,
        searchLimit,
        log,
        signal,
        onQueueWait
      ),
      fetchedAt: new Date().toISOString(),
    }),
  });

  if (!stale) return value.chunks;
  return value.chunks.map((chunk) => ({ ...chunk, source: { ...chunk.source, stale: true } }));
}

/** Creates a `SourceResolver` backed by MediaWiki: ConsoleGamesWiki first, Fandom FFXIV as a fallback. */
export function createMediaWikiResolver(
  client: MediaWikiClient,
  cache: CacheClient,
  baseUrls: Readonly<Record<MediaWikiWikiId, string>>,
  categories: readonly UsageCategory[],
  log: pino.Logger
): SourceResolver {
  return {
    supportedCategories: categories,
    async resolve(query: string, options: ResolveOptions): Promise<readonly RetrievedChunk[]> {
      // knowledgeService fans out to every resolver when the query's category is unknown
      // (UNCATEGORIZED) -- only do the real work (outbound wiki searches) when this resolver
      // actually declared the category, not for every uncategorized query that reaches it.
      if (options.category !== undefined && !categories.includes(options.category)) {
        return [];
      }

      const topK = options.topK ?? DEFAULT_SEARCH_LIMIT;
      // Bound the search term -- the raw chat message can be up to 12,000 chars, which would
      // otherwise go unmodified into a GET request's query string (see MAX_SEARCH_QUERY_CHARS).
      const searchQuery = truncateAtWordBoundary(query, MAX_SEARCH_QUERY_CHARS);
      // ConsoleGamesWiki first, Fandom FFXIV only as a fallback when CGW has nothing usable.
      // Both wikis get identical error handling: a failure on either one is logged with which
      // wiki failed and moves on to the next source (or an empty result) rather than throwing.
      const wikiOrder: readonly MediaWikiWikiId[] = [
        MediaWikiWikiId.ConsoleGamesWiki,
        MediaWikiWikiId.FandomFfxiv,
      ];

      // Tracks whether every wiki attempt errored outright (network/timeout/rate-limit) as
      // opposed to succeeding with zero matches -- the two look the same to the caller ("no
      // chunks") unless distinguished here, but only the former means MediaWiki itself is
      // unavailable. knowledgeService only reports SOURCE_UNAVAILABLE for a category when every
      // resolver serving it fails; a resolver that silently returns [] on a real outage (instead
      // of throwing) hides that outage whenever another resolver sharing the category (e.g.
      // XivApiResolver on UNLOCKS) also comes back empty rather than rejecting.
      let allWikisFailed = true;

      for (const wikiId of wikiOrder) {
        if (options.signal?.aborted) return [];
        // Only Fandom gets the FFXIV boost -- ConsoleGamesWiki is already FFXIV-only, so
        // appending it there would just be noise against an already-scoped search.
        const wikiQuery =
          wikiId === MediaWikiWikiId.FandomFfxiv
            ? `${searchQuery} ${FANDOM_FFXIV_SEARCH_BOOST}`
            : searchQuery;
        try {
          const chunks = await resolveForWiki(
            client,
            cache,
            wikiId,
            baseUrls[wikiId],
            wikiQuery,
            topK,
            log,
            options.signal,
            options.onQueueWait
          );
          allWikisFailed = false;
          if (chunks.length > 0) return chunks;
        } catch (err) {
          log.warn({ err, query: wikiQuery, wikiId }, 'MediaWiki lookup failed for this wiki');
        }
      }

      if (allWikisFailed) {
        throw AppError.sourceUnavailable(
          'Unable to load data from MediaWiki: all configured wikis failed'
        );
      }
      return [];
    },
  };
}
