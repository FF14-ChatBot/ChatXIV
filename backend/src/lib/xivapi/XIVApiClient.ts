/**
 * XIVAPI v2 (boilmaster) HTTP client factory.
 *
 * Provides a thin wrapper around `fetchWithRetry` for querying v2.xivapi.com game-data endpoints.
 * All outbound requests are throttled by a token-bucket rate limiter and guarded by a timeout.
 *
 * Retry, backoff, and error handling are delegated to the shared `fetchWithRetry` module;
 * this file only owns URL construction and parameter mapping.
 *
 * XIVAPI v2 is open and requires no authentication.
 */

import type pino from 'pino';
import { fetchWithRetry } from '../http/fetchWithRetry.js';
import type { TokenBucket } from './throttle.js';
import type {
  XivApiClient,
  XivApiRowParams,
  XivApiRowResponse,
  XivApiSearchParams,
  XivApiSearchResult,
} from './types.js';

/** Configuration consumed by the client factory. */
export interface XivApiClientConfig {
  readonly baseUrl: string;
  readonly timeoutMs: number;
}

const SOURCE_NAME = 'XIVAPI';

/** Creates an `XivApiClient` backed by native `fetch`, a token-bucket throttle, and Pino logger. */
export function createXivApiClient(
  config: XivApiClientConfig,
  throttle: TokenBucket,
  log: pino.Logger
): XivApiClient {
  const retryOptions = {
    timeoutMs: config.timeoutMs,
    sourceName: SOURCE_NAME,
    beforeAttempt: () => throttle.consume(),
  };

  function buildUrl(path: string): URL {
    const base = config.baseUrl.endsWith('/') ? config.baseUrl : config.baseUrl + '/';
    return new URL(path, base);
  }

  function setOptionalParam(url: URL, key: string, value: string | number | undefined): void {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return {
    async search(params: XivApiSearchParams): Promise<XivApiSearchResult> {
      const url = buildUrl('search');
      setOptionalParam(url, 'query', params.query);
      setOptionalParam(url, 'sheets', params.sheets);
      setOptionalParam(url, 'cursor', params.cursor);
      setOptionalParam(url, 'limit', params.limit);
      setOptionalParam(url, 'language', params.language);
      setOptionalParam(url, 'fields', params.fields);
      setOptionalParam(url, 'transient', params.transient);

      return (await fetchWithRetry(url.toString(), retryOptions, log)) as XivApiSearchResult;
    },

    async getRow(sheet: string, row: number, params?: XivApiRowParams): Promise<XivApiRowResponse> {
      const url = buildUrl(`sheet/${encodeURIComponent(sheet)}/${row}`);
      setOptionalParam(url, 'language', params?.language);
      setOptionalParam(url, 'fields', params?.fields);
      setOptionalParam(url, 'transient', params?.transient);

      return (await fetchWithRetry(url.toString(), retryOptions, log)) as XivApiRowResponse;
    },
  };
}
