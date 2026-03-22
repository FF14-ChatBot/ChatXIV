/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

interface ImportMetaEnv {
  VITE_PUBLIC_POSTHOG_TOKEN?: string;
  VITE_PUBLIC_POSTHOG_HOST?: string;
  VITE_CHATXIV_BACKEND_URL?: string;
}

interface ImportMeta {
  env: ImportMetaEnv;
}
