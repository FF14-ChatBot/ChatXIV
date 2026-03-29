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
