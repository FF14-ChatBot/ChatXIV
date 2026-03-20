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
      ANTHROPIC_API_KEY?: string;
      ANTHROPIC_MODEL?: string;
      DATA_DIR?: string;
      ADMIN_API_KEY?: string;
      SQLITE_DB_PATH?: string;
      OBSERVABILITY_SQLITE?: string;
    }
  }
}

export {};
