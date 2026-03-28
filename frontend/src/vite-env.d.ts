/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

interface ImportMetaEnv {
  /** Build-time label for telemetry (e.g. production, preview, beta). See `getDeployEnvironment()`. */
  readonly VITE_DEPLOY_ENV?: string;
  VITE_APP_VERSION?: string;
  VITE_GRAFANA_FARO_URL?: string;
  VITE_PUBLIC_POSTHOG_TOKEN?: string;
  VITE_PUBLIC_POSTHOG_HOST?: string;
  VITE_CHATXIV_BACKEND_URL?: string;
}

interface ImportMeta {
  env: ImportMetaEnv;
}
