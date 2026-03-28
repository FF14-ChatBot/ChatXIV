/**
 * Logical deploy environment for analytics/observability (e.g. Faro `app.environment`).
 * Set `VITE_DEPLOY_ENV` at build time (Cloudflare Pages: Production vs Preview scoped vars).
 * Falls back to Vite’s `import.meta.env.MODE` (`development` in dev, `production` from `vite build`).
 */
export function getDeployEnvironment(): string {
  const fromEnv = import.meta.env.VITE_DEPLOY_ENV;
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') {
    return fromEnv.trim();
  }
  return import.meta.env.MODE;
}
