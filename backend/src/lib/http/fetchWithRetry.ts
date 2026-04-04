/**
 * Reusable fetch-with-retry for outbound HTTP calls to external APIs.
 *
 * Retry policy:
 *   - Exponential backoff: base * 2^attempt (default 1 s, 2 s, 4 s).
 *   - A 429 `Retry-After` header (seconds) overrides the computed delay.
 *   - Non-retryable status codes (4xx other than 429) throw immediately.
 *   - Network errors and timeouts throw immediately (no retry).
 *
 * All failures throw `AppError.sourceUnavailable()` so they flow through
 * the error-handling middleware as 503 responses.
 */

import type pino from 'pino';
import { AppError } from '../errors/AppError.js';

export interface FetchWithRetryOptions {
  /** Abort timeout per attempt (ms). */
  readonly timeoutMs: number;
  /** Maximum retry attempts after the initial request. */
  readonly maxRetries?: number;
  /** Base delay for exponential backoff (ms). Actual delay = base * 2^attempt. */
  readonly backoffBaseMs?: number;
  /** Human-readable source name for error messages (e.g. "XIVAPI", "Universalis"). */
  readonly sourceName: string;
  /** Optional hook called before each fetch attempt (e.g. token-bucket throttle). */
  readonly beforeAttempt?: () => Promise<void>;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BACKOFF_BASE_MS = 1_000;

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function computeRetryDelay(
  attempt: number,
  retryAfterHeader: string | null,
  backoffBaseMs: number
): number {
  if (retryAfterHeader !== null) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds > 0) {
      return seconds * 1_000;
    }
  }
  return backoffBaseMs * 2 ** attempt;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTimeoutError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'TimeoutError') return true;
  if (err instanceof Error && err.name === 'AbortError') return true;
  return false;
}

/**
 * Fetches `url` with timeout, retry on 429/5xx, and exponential backoff.
 * Returns the parsed JSON body on success.
 * Throws `AppError.sourceUnavailable()` on any terminal failure.
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions,
  log: pino.Logger
): Promise<unknown> {
  const {
    timeoutMs,
    maxRetries = DEFAULT_MAX_RETRIES,
    backoffBaseMs = DEFAULT_BACKOFF_BASE_MS,
    sourceName,
    beforeAttempt,
  } = options;

  let lastStatus: number | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (beforeAttempt) {
      await beforeAttempt();
    }

    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (err: unknown) {
      if (isTimeoutError(err)) {
        throw AppError.sourceUnavailable(`${sourceName} request timed out after ${timeoutMs}ms`);
      }
      throw AppError.sourceUnavailable(
        err instanceof Error ? err.message : `${sourceName} network error`
      );
    }

    if (res.ok) {
      return (await res.json()) as unknown;
    }

    lastStatus = res.status;

    if (!isRetryableStatus(res.status)) {
      throw AppError.sourceUnavailable(`${sourceName} responded with ${res.status}`);
    }

    if (attempt < maxRetries) {
      const delay = computeRetryDelay(attempt, res.headers.get('Retry-After'), backoffBaseMs);
      log.warn(
        { status: res.status, attempt, delay, url },
        `${sourceName} retryable error; backing off`
      );
      await sleep(delay);
    }
  }

  throw AppError.sourceUnavailable(
    `${sourceName} responded with ${lastStatus} after ${maxRetries} retries`
  );
}
