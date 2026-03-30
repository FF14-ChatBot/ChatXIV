/**
 * Canonical HTTP header names for browser requests and CORS `allowedHeaders`.
 * For Node `IncomingMessage.headers`, use {@link HTTP_HEADER_NAMES_LOWER} where applicable.
 */
export const HTTP_HEADER_NAMES = {
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
  IDEMPOTENCY_KEY: 'Idempotency-Key',
  X_SESSION_ID: 'X-Session-Id',
  X_REQUEST_ID: 'X-Request-Id',
  CF_TURNSTILE_RESPONSE: 'CF-Turnstile-Response',
} as const;

/** Lowercase forms matching Node’s normalized `IncomingMessage.headers` keys. */
export const HTTP_HEADER_NAMES_LOWER = {
  IDEMPOTENCY_KEY: 'idempotency-key',
} as const;
