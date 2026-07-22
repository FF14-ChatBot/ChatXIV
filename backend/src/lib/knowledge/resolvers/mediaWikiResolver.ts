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
import { MediaWikiWikiId } from '../../config/constants.js';
import type {
  MediaWikiApiResponse,
  MediaWikiClient,
  MediaWikiSearchResultEntry,
} from '../../mediawiki/types.js';
import type { ResolveOptions, RetrievedChunk, SourceResolver } from '../types.js';

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
    depth = match[0].startsWith('</') ? Math.max(0, depth - 1) : depth + 1;
    lastIndex = TABLE_TAG_PATTERN.lastIndex;
  }
  if (depth === 0) {
    result += html.slice(lastIndex);
  }
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
  signal: AbortSignal | undefined
): Promise<RetrievedChunk | undefined> {
  const response = await client.parse(wikiId, { page: entry.title }, signal);
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
    score: 1 / (rank + 1),
  };
}

async function resolveForWiki(
  client: MediaWikiClient,
  wikiId: MediaWikiWikiId,
  baseUrl: string,
  query: string,
  topK: number,
  log: pino.Logger,
  signal: AbortSignal | undefined
): Promise<readonly RetrievedChunk[]> {
  const searchResponse = await client.search(wikiId, query, topK, signal);
  const candidates = searchResponse.query.search.slice(0, MAX_PAGES_TO_PARSE);
  if (candidates.length === 0) return [];

  const settled = await Promise.allSettled(
    candidates.map((entry, rank) => parseCandidate(client, wikiId, baseUrl, entry, rank, signal))
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

/** Creates a `SourceResolver` backed by MediaWiki: ConsoleGamesWiki first, Fandom FFXIV as a fallback. */
export function createMediaWikiResolver(
  client: MediaWikiClient,
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

      for (const wikiId of wikiOrder) {
        try {
          const chunks = await resolveForWiki(
            client,
            wikiId,
            baseUrls[wikiId],
            searchQuery,
            topK,
            log,
            options.signal
          );
          if (chunks.length > 0) return chunks;
        } catch (err) {
          log.warn({ err, query: searchQuery, wikiId }, 'MediaWiki lookup failed for this wiki');
        }
      }

      return [];
    },
  };
}
