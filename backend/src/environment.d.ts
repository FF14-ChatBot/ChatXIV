declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /**
       * Canonical values: `development` | `beta` | `production`. At runtime this is still `string`
       * (Vitest uses `test`, legacy `dev` exists, empty string is possible) — `getNodeEnv()` normalizes.
       */
      NODE_ENV?: string;
      PORT?: string;
      CORS_ORIGIN?: string;
      LOG_LEVEL?: string;
      DEBUG_MODE?: string;
      TURNSTILE_SECRET_KEY?: string;
      ANTHROPIC_API_KEY?: string;
      ANTHROPIC_MODEL?: string;
      ANTHROPIC_MAX_TOKENS?: string;
      ANTHROPIC_TIMEOUT_MS?: string;
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
      REDIS_URL?: string;
      CACHE_BACKEND?: string;
      REDIS_REQUIRED?: string;
      XIVAPI_USER_AGENT?: string;
      MEDIAWIKI_USER_AGENT?: string;
      MEDIAWIKI_USER_AGENT_REQUIRED?: string;
      MEDIAWIKI_TIMEOUT_MS?: string;
      MEDIAWIKI_RATE_LIMIT_PER_SECOND?: string;
      MEDIAWIKI_RATE_LIMIT_QUEUE_TIMEOUT_MS?: string;
      MEDIAWIKI_CGW_URL?: string;
      MEDIAWIKI_FANDOM_FFXIV_URL?: string;
      VITEST_WORKER_ID?: string;
    }
  }
}

export {};
