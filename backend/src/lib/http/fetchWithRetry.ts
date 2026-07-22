/**
 * Base HTTP client with retry-on-429/5xx and exponential backoff.
 *
 * Subclasses extend `RetryingHttpClient`, pass retry settings to `super()`, and call
 * `this.fetchJson(url, log)` or `this.fetchBlob(url, log)` for GET responses.
 *
 * Retry policy:
 *   - Exponential backoff: base * 2^attempt (default 1 s, 2 s, 4 s).
 *   - A 429 `Retry-After` header (seconds) overrides the computed delay.
 *   - Non-retryable status codes (4xx other than 429) throw immediately.
 *   - Network errors and timeouts throw immediately (no retry).
 *
 * The `@Retryable` decorator enforces the attempt budget; delays are applied in the
 * runner (`backOff: 0` on the decorator) so `Retry-After` and backoff stay correct.
 *
 * Terminal failures throw `AppError.sourceUnavailable()` (503 + CDM code) for the
 * global error middleware.
 */

import type pino from 'pino';
import { Retryable, BackOffPolicy } from 'typescript-retry-decorator';
import { AppError } from '../errors/AppError.js';
import { requestContext } from '../request/requestContext.js';

/** Configuration for `RetryingHttpClient` retry and timeout behavior. */
export interface RetryingHttpClientConfig {
  /** Abort timeout per attempt (ms). */
  readonly timeoutMs: number;
  /** Maximum retry attempts after the initial request. */
  readonly maxRetries?: number;
  /** Base delay for exponential backoff (ms). Actual delay = base * 2^attempt. */
  readonly backoffBaseMs?: number;
  /** Human-readable source name for error messages (e.g. "XIVAPI", "Universalis"). */
  readonly sourceName: string;
  /** Optional hook called before each fetch attempt (e.g. token-bucket throttle). */
  readonly beforeAttempt?: (ctx: BeforeAttemptContext) => Promise<void>;
  /** Sent on every request (e.g. a required `User-Agent` per upstream policy). */
  readonly headers?: Readonly<Record<string, string>>;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BACKOFF_BASE_MS = 1_000;

/** Context passed to `beforeAttempt` so hooks (e.g. throttles) can attribute work. */
export interface BeforeAttemptContext {
  readonly url: string;
  /** Incoming HTTP request id when `fetchJson` runs inside `requestContext` middleware. */
  readonly requestId?: string;
}

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

class RetryableHttpStatusError extends Error {
  constructor() {
    super('retryable upstream status');
    this.name = 'RetryableHttpStatusError';
  }
}

export abstract class RetryingHttpClient {
  protected constructor(protected readonly retryConfig: RetryingHttpClientConfig) {}

  /**
   * Single HTTP GET with timeout (one attempt). For headers that are fixed for the life of
   * the client (e.g. a required `User-Agent`), pass `retryConfig.headers` instead of
   * overriding this method. Override in subclasses for POST, per-attempt/dynamic headers,
   * or non-JSON pipelines while keeping `fetchJson` retry behavior.
   */
  protected async connect(url: string): Promise<Response> {
    const { timeoutMs, sourceName, headers } = this.retryConfig;
    try {
      return await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        ...(headers !== undefined ? { headers } : {}),
      });
    } catch (err: unknown) {
      if (isTimeoutError(err)) {
        throw AppError.sourceUnavailable(`${sourceName} request timed out after ${timeoutMs}ms`);
      }
      throw AppError.sourceUnavailable(
        err instanceof Error ? err.message : `${sourceName} network error`
      );
    }
  }

  /**
   * GET JSON with retries on 429/5xx. The `@Retryable` runner invokes `connect` per attempt.
   */
  fetchJson(url: string, log: pino.Logger): Promise<unknown> {
    const {
      maxRetries = DEFAULT_MAX_RETRIES,
      backoffBaseMs = DEFAULT_BACKOFF_BASE_MS,
      sourceName,
      beforeAttempt,
    } = this.retryConfig;

    const runConnect = (): Promise<Response> => this.connect(url);

    class JsonRetryRunner {
      private attempt = 0;

      @Retryable({
        maxAttempts: maxRetries,
        backOff: 0,
        backOffPolicy: BackOffPolicy.FixedBackOffPolicy,
        value: [RetryableHttpStatusError],
        useOriginalError: true,
        useConsoleLogger: false,
      })
      async run(): Promise<unknown> {
        if (beforeAttempt) {
          const store = requestContext.get();
          await beforeAttempt({
            url,
            ...(store?.requestId !== undefined ? { requestId: store.requestId } : {}),
          });
        }

        const res = await runConnect();

        if (res.ok) {
          return (await res.json()) as unknown;
        }

        if (!isRetryableStatus(res.status)) {
          throw AppError.sourceUnavailable(`${sourceName} responded with ${res.status}`);
        }

        if (this.attempt >= maxRetries) {
          throw AppError.sourceUnavailable(
            `${sourceName} responded with ${res.status} after ${maxRetries} retries`
          );
        }

        const delay = computeRetryDelay(
          this.attempt,
          res.headers.get('Retry-After'),
          backoffBaseMs
        );
        log.warn(
          { status: res.status, attempt: this.attempt, delay, url },
          `${sourceName} retryable error; backing off`
        );
        this.attempt += 1;
        await sleep(delay);
        throw new RetryableHttpStatusError();
      }
    }

    return new JsonRetryRunner().run();
  }

  /**
   * GET binary body with retries on 429/5xx. Same attempt budget and backoff as `fetchJson`.
   */
  fetchBlob(url: string, log: pino.Logger): Promise<Blob> {
    const {
      maxRetries = DEFAULT_MAX_RETRIES,
      backoffBaseMs = DEFAULT_BACKOFF_BASE_MS,
      sourceName,
      beforeAttempt,
    } = this.retryConfig;

    const runConnect = (): Promise<Response> => this.connect(url);

    class BlobRetryRunner {
      private attempt = 0;

      @Retryable({
        maxAttempts: maxRetries,
        backOff: 0,
        backOffPolicy: BackOffPolicy.FixedBackOffPolicy,
        value: [RetryableHttpStatusError],
        useOriginalError: true,
        useConsoleLogger: false,
      })
      async run(): Promise<Blob> {
        if (beforeAttempt) {
          const store = requestContext.get();
          await beforeAttempt({
            url,
            ...(store?.requestId !== undefined ? { requestId: store.requestId } : {}),
          });
        }

        const res = await runConnect();

        if (res.ok) {
          return res.blob();
        }

        if (!isRetryableStatus(res.status)) {
          throw AppError.sourceUnavailable(`${sourceName} responded with ${res.status}`);
        }

        if (this.attempt >= maxRetries) {
          throw AppError.sourceUnavailable(
            `${sourceName} responded with ${res.status} after ${maxRetries} retries`
          );
        }

        const delay = computeRetryDelay(
          this.attempt,
          res.headers.get('Retry-After'),
          backoffBaseMs
        );
        log.warn(
          { status: res.status, attempt: this.attempt, delay, url },
          `${sourceName} retryable error; backing off`
        );
        this.attempt += 1;
        await sleep(delay);
        throw new RetryableHttpStatusError();
      }
    }

    return new BlobRetryRunner().run();
  }
}
