import { logger } from '../logger/instance';

function isUnset(value: string | undefined): boolean {
  return value === undefined || value.trim() === '';
}

/**
 * Log a warning for each optional `VITE_*` variable that is unset or blank, even when the app
 * supplies a default. Call once at app boot after `setLogger()`.
 */
export function warnMissingViteEnvVars(): void {
  const env = import.meta.env;

  if (isUnset(env.VITE_DEPLOY_ENV)) {
    logger.warn('VITE_DEPLOY_ENV is not set; using Vite MODE as deploy environment', {
      defaultUsed: env.MODE,
    });
  }

  if (isUnset(env.VITE_CHATXIV_BACKEND_URL)) {
    logger.warn(
      'VITE_CHATXIV_BACKEND_URL is not set; using same-origin (empty base) for API and auth',
      { defaultUsed: 'same-origin' }
    );
  }

  if (isUnset(env.VITE_GRAFANA_FARO_URL)) {
    logger.warn('VITE_GRAFANA_FARO_URL is not set; Faro observability is disabled', {
      defaultUsed: 'noop',
    });
  }

  if (isUnset(env.VITE_APP_VERSION)) {
    logger.warn('VITE_APP_VERSION is not set; using default app version', { defaultUsed: '0.0.0' });
  }

  if (isUnset(env.VITE_PUBLIC_POSTHOG_TOKEN)) {
    logger.warn('VITE_PUBLIC_POSTHOG_TOKEN is not set; PostHog analytics is disabled', {
      defaultUsed: 'noop',
    });
  }

  if (!isUnset(env.VITE_PUBLIC_POSTHOG_TOKEN) && isUnset(env.VITE_PUBLIC_POSTHOG_HOST)) {
    logger.warn('VITE_PUBLIC_POSTHOG_HOST is not set; using default PostHog ingest host', {
      defaultUsed: 'https://us.i.posthog.com',
    });
  }
}
