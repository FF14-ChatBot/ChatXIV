/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

interface ImportMetaEnv {
  VITE_PUBLIC_POSTHOG_TOKEN?: string;
  VITE_PUBLIC_POSTHOG_HOST?: string;
  VITE_CHATXIV_BACKEND_URL?: string;
  /** When `true`, production builds redirect `/` and unknown paths to `/unavailable` (pre-release gate). */
  VITE_APP_PRELAUNCH_REDIRECT?: string;
  /** Google AdSense publisher id (`ca-pub-…`) — loads `adsbygoogle.js` when set. */
  VITE_PUBLIC_ADSENSE_CLIENT?: string;
  /** Default display ad slot when welcome/messages-specific slots are unset. */
  VITE_PUBLIC_ADSENSE_SLOT?: string;
  /** Optional slot for the welcome (empty) state ad region. */
  VITE_PUBLIC_ADSENSE_SLOT_WELCOME?: string;
  /** Optional slot for the conversation view ad region. */
  VITE_PUBLIC_ADSENSE_SLOT_MESSAGES?: string;
}

interface ImportMeta {
  env: ImportMetaEnv;
}
