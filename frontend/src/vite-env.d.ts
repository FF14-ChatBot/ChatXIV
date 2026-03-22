/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

interface ImportMetaEnv {
  VITE_PUBLIC_POSTHOG_TOKEN?: string;
  VITE_PUBLIC_POSTHOG_HOST?: string;
  VITE_CHATXIV_BACKEND_URL?: string;
  /** When `true`, production builds show only the /unavailable page (pre-release gate). */
  VITE_APP_PRELAUNCH_REDIRECT?: string;
}

interface ImportMeta {
  env: ImportMetaEnv;
}
