declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: 'development' | 'production' | 'test';
      PORT?: string;
      CORS_ORIGIN?: string;
      LOG_LEVEL?: string;
      DEBUG_MODE?: string;
      MAX_BODY_SIZE_KB?: string;
      REQUEST_TIMEOUT_MS?: string;
      RATE_LIMIT_CAPACITY?: string;
      RATE_LIMIT_REFILL_PER_MIN?: string;
      TURNSTILE_SECRET_KEY?: string;
      ANTHROPIC_API_KEY?: string;
      ANTHROPIC_MODEL?: string;
      DATA_DIR?: string;
      OIDC_ISSUER?: string;
      OIDC_CLIENT_ID?: string;
      OIDC_CLIENT_SECRET?: string;
      OIDC_REDIRECT_URI?: string;
      FRONTEND_ORIGIN?: string;
      SESSION_SECRET?: string;
      BOOTSTRAP_ADMIN_SUBS?: string;
      LOKI_HOST?: string;
      LOKI_USER_ID?: string;
      LOKI_PASSWORD?: string;
      VITEST_WORKER_ID?: string;
    }
  }
}

export {};
