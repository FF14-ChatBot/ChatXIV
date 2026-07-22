/**
 * MediaWiki Action API client (ConsoleGamesWiki, Fandom FFXIV).
 *
 * Thin wrapper around `RetryingHttpClient`: retry, backoff, and 429/5xx handling are inherited;
 * this module owns URL construction, the required `User-Agent` header, and per-wiki throttling.
 *
 * One client instance serves every configured wiki (`wikiId` selects base URL and rate limiter),
 * per Cache-Layer-Per-Category's Option A recommendation. Caching is out of scope here.
 */

import type pino from 'pino';
import { RetryingHttpClient, type BeforeAttemptContext } from '../http/fetchWithRetry.js';
import { MediaWikiWikiId } from '../config/constants.js';
import {
  getMediaWikiUserAgent,
  getMediaWikiTimeoutMs,
  getMediaWikiRateLimitPerSecond,
  getMediaWikiBaseUrl,
} from '../config/env.js';
import { createMediaWikiRateLimiter, type MediaWikiRateLimiter } from './rateLimit.js';
import type {
  MediaWikiApiResponse,
  MediaWikiClient,
  MediaWikiParseParams,
  MediaWikiQueryParams,
  MediaWikiSearchResponse,
} from './types.js';

const SOURCE_NAME = 'MediaWiki';

export interface MediaWikiClientConfig {
  readonly baseUrls: Readonly<Record<MediaWikiWikiId, string>>;
  readonly timeoutMs: number;
  readonly userAgent: string;
}

/** Finds which configured wiki a fully-built request URL belongs to (for per-wiki throttling). */
function wikiIdForUrl(
  baseUrls: Readonly<Record<MediaWikiWikiId, string>>,
  url: string
): MediaWikiWikiId | undefined {
  for (const [wikiId, base] of Object.entries(baseUrls) as [MediaWikiWikiId, string][]) {
    if (url.startsWith(base)) return wikiId;
  }
  return undefined;
}

/**
 * Normalizes each base URL through the WHATWG URL parser so `wikiIdForUrl`'s prefix match
 * always agrees with `buildUrl`'s output — an operator-supplied override (env var) that
 * differs only in casing, an explicit default port, etc. would otherwise never match and
 * silently disable throttling for that wiki.
 */
function normalizeBaseUrls(
  baseUrls: Readonly<Record<MediaWikiWikiId, string>>
): Readonly<Record<MediaWikiWikiId, string>> {
  const normalized: Record<string, string> = {};
  for (const [wikiId, base] of Object.entries(baseUrls)) {
    normalized[wikiId] = new URL(base).toString();
  }
  return normalized as Readonly<Record<MediaWikiWikiId, string>>;
}

export class MediaWikiHttpClient extends RetryingHttpClient implements MediaWikiClient {
  private readonly log: pino.Logger;
  private readonly baseUrls: Readonly<Record<MediaWikiWikiId, string>>;

  constructor(config: MediaWikiClientConfig, rateLimiter: MediaWikiRateLimiter, log: pino.Logger) {
    const baseUrls = normalizeBaseUrls(config.baseUrls);
    super({
      timeoutMs: config.timeoutMs,
      sourceName: SOURCE_NAME,
      headers: { 'User-Agent': config.userAgent },
      beforeAttempt: (ctx: BeforeAttemptContext) => {
        const wikiId = wikiIdForUrl(baseUrls, ctx.url);
        if (wikiId === undefined) return Promise.resolve();
        return rateLimiter.forWiki(wikiId).consume({
          url: ctx.url,
          wikiId,
          ...(ctx.requestId !== undefined ? { requestId: ctx.requestId } : {}),
        });
      },
    });
    this.baseUrls = baseUrls;
    this.log = log;
  }

  private buildUrl(
    wikiId: MediaWikiWikiId,
    action: string,
    params: Readonly<Record<string, string>>
  ): URL {
    const url = new URL(this.baseUrls[wikiId]);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    // Set after params so a caller-supplied `action`/`format` key can never
    // override the intended request.
    url.searchParams.set('action', action);
    url.searchParams.set('format', 'json');
    return url;
  }

  private async request<T>(
    wikiId: MediaWikiWikiId,
    action: string,
    params: Readonly<Record<string, string>>,
    signal?: AbortSignal
  ): Promise<T> {
    const url = this.buildUrl(wikiId, action, params);
    return (await this.fetchJson(url.toString(), this.log, signal)) as T;
  }

  async query(
    wikiId: MediaWikiWikiId,
    params: MediaWikiQueryParams,
    signal?: AbortSignal
  ): Promise<MediaWikiApiResponse> {
    return this.request<MediaWikiApiResponse>(wikiId, 'query', params, signal);
  }

  async parse(
    wikiId: MediaWikiWikiId,
    params: MediaWikiParseParams,
    signal?: AbortSignal
  ): Promise<MediaWikiApiResponse> {
    return this.request<MediaWikiApiResponse>(wikiId, 'parse', params, signal);
  }

  async search(
    wikiId: MediaWikiWikiId,
    srsearch: string,
    limit?: number,
    signal?: AbortSignal
  ): Promise<MediaWikiSearchResponse> {
    const params: Record<string, string> = { list: 'search', srsearch };
    if (limit !== undefined) {
      params.srlimit = String(limit);
    }
    return this.request<MediaWikiSearchResponse>(wikiId, 'query', params, signal);
  }
}

/** Creates a `MediaWikiClient` backed by native `fetch`, per-wiki throttling, and a Pino logger. */
export function createMediaWikiClient(
  config: MediaWikiClientConfig,
  rateLimiter: MediaWikiRateLimiter,
  log: pino.Logger
): MediaWikiClient {
  return new MediaWikiHttpClient(config, rateLimiter, log);
}

export interface MediaWikiClientFromEnv {
  readonly client: MediaWikiClient;
  /** Resolved base URLs (env override or default), for callers that also need to build article URLs. */
  readonly baseUrls: Readonly<Record<MediaWikiWikiId, string>>;
}

/**
 * Builds a real `MediaWikiClient` (and its resolved base URLs) from env, via the same
 * `getMediaWiki*` getters either way -- shared by the DI container and the standalone
 * `scripts/manual/mediawikiSmoke.ts` so both are guaranteed to construct the client identically
 * instead of two hand-maintained copies of the same wiring drifting apart.
 */
export function createMediaWikiClientFromEnv(log: pino.Logger): MediaWikiClientFromEnv {
  const baseUrls: Readonly<Record<MediaWikiWikiId, string>> = {
    [MediaWikiWikiId.ConsoleGamesWiki]: getMediaWikiBaseUrl(MediaWikiWikiId.ConsoleGamesWiki),
    [MediaWikiWikiId.FandomFfxiv]: getMediaWikiBaseUrl(MediaWikiWikiId.FandomFfxiv),
  };
  const config: MediaWikiClientConfig = {
    baseUrls,
    timeoutMs: getMediaWikiTimeoutMs(),
    userAgent: getMediaWikiUserAgent(),
  };
  const rateLimiter = createMediaWikiRateLimiter(getMediaWikiRateLimitPerSecond(), log);
  const client = createMediaWikiClient(config, rateLimiter, log);
  return { client, baseUrls };
}
