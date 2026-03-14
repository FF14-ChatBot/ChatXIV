export interface ChatxivApiConfig {
  baseUrl?: string;
  /** Sent as X-Session-Id; backend uses it for rate limiting. */
  getSessionId?: () => string | undefined;
}
