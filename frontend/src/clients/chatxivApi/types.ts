export interface ChatxivApiConfig {
  baseUrl?: string;
  /** Sent as X-Session-Id; backend uses it for rate limiting. */
  getSessionId?: () => string | undefined;
}

export interface ChatxivApiRequestOptions {
  body?: unknown;
  config?: ChatxivApiConfig;
  signal?: AbortSignal;
}

/** ChatXIV API client interface. Swap implementation at app boot for tests or alternate backends. */
export interface ChatxivApiClient {
  request<T = unknown>(
    method: string,
    path: string,
    options?: ChatxivApiRequestOptions
  ): Promise<T>;
}
