/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_POSTHOG_TOKEN?: string;
  readonly VITE_PUBLIC_POSTHOG_HOST?: string;
  readonly VITE_CHATXIV_BACKEND_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
