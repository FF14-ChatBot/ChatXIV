/**
 * Build-time / runtime flags derived from Vite env. Keeps routing and shell logic free of
 * scattered `import.meta.env` reads.
 */
export function isPrelaunchRedirectEnabled(): boolean {
  return import.meta.env.PROD === true && import.meta.env.VITE_APP_PRELAUNCH_REDIRECT === 'true';
}
