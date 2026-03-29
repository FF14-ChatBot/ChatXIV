import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { FaroErrorBoundary } from '@grafana/faro-react';
import { IS_PRODUCT_LIVE } from '@chatxiv/cdm';
import { setAnalytics } from './lib/analytics/instance';
import { createPostHogAnalytics } from './lib/analytics/posthogAnalytics';
import { createNoopAnalytics } from './lib/analytics/noopAnalytics';
import { setObservability } from './lib/observability/instance';
import { createFaroObservability } from './lib/observability/faroObservability';
import { createNoopObservability } from './lib/observability/noopObservability';
import { setLogger, logger } from './lib/logger/instance';
import { createConsoleLogger } from './lib/logger/consoleLogger';
import { setChatxivApiClient } from './clients/chatxivApi/instance';
import { createChatxivApiClient } from './clients/chatxivApi/client';
import { setAuthApiClient } from './clients/authApi/instance';
import { createAuthApiClient } from './clients/authApi/client';
import { fetchFeatureFlagEntry } from './clients/chatxivApi/featureFlags';
import { ApiClientError } from './clients/chatxivApi/errors/ApiClientError';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalErrorHandler } from './components/GlobalErrorHandler';
import { ThemeProvider } from './theme/ThemeProvider';
import { AuthProvider } from './features/auth/AuthProvider';
import App from './App';
import { getAdsenseClient } from './lib/adsense/adsenseRegistry.js';
import { loadAdsenseScript } from './lib/adsense/loadAdsenseScript';
import { getDeployEnvironment } from './lib/config/deployEnvironment';
import { warnMissingViteEnvVars } from './lib/config/warnMissingViteEnv';
import './index.css';

setLogger(createConsoleLogger());
setChatxivApiClient(createChatxivApiClient());
setAuthApiClient(createAuthApiClient());

async function resolveIsProductLiveAtBoot(): Promise<boolean> {
  try {
    const entry = await fetchFeatureFlagEntry(IS_PRODUCT_LIVE);
    return entry.enabled === true;
  } catch (error: unknown) {
    const context =
      error instanceof ApiClientError
        ? { code: error.code, status: error.status }
        : { reason: 'unexpected_error' as const };
    logger.warn('isProductLive flag fetch failed; main routes blocked until it succeeds', context);
    return false;
  }
}

async function boot(): Promise<void> {
  warnMissingViteEnvVars();

  const isProductLive = await resolveIsProductLiveAtBoot();

  const adsenseClient = getAdsenseClient();
  if (adsenseClient !== undefined) {
    loadAdsenseScript(adsenseClient);
  }

  const faroUrl = import.meta.env.VITE_GRAFANA_FARO_URL as string | undefined;
  const observability = faroUrl
    ? createFaroObservability({
        collectorUrl: faroUrl,
        appName: 'ChatXIV',
        appVersion: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '0.0.0',
        environment: getDeployEnvironment(),
      })
    : createNoopObservability();
  setObservability(observability);

  const posthogToken = import.meta.env.VITE_PUBLIC_POSTHOG_TOKEN as string | undefined;
  const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined;

  const analytics = posthogToken
    ? createPostHogAnalytics({
        token: posthogToken,
        host: posthogHost || 'https://us.i.posthog.com',
        capturePageview: false,
        personProfiles: 'identified_only',
      })
    : createNoopAnalytics();
  setAnalytics(analytics);

  logger.debug('App boot');

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <FaroErrorBoundary>
        <ErrorBoundary>
          <GlobalErrorHandler>
            <BrowserRouter>
              <ThemeProvider>
                <AuthProvider>
                  <App isProductLive={isProductLive} />
                </AuthProvider>
              </ThemeProvider>
            </BrowserRouter>
          </GlobalErrorHandler>
        </ErrorBoundary>
      </FaroErrorBoundary>
    </StrictMode>
  );
}

void boot();
