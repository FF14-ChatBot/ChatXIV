import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { setAnalytics } from './lib/analytics/instance';
import { createPostHogAnalytics } from './lib/analytics/posthogAnalytics';
import { createNoopAnalytics } from './lib/analytics/noopAnalytics';
import { setLogger, logger } from './lib/logger/instance';
import { createConsoleLogger } from './lib/logger/consoleLogger';
import { setChatxivApiClient } from './clients/chatxivApi/instance';
import { createChatxivApiClient } from './clients/chatxivApi/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalErrorHandler } from './components/GlobalErrorHandler';
import App from './App';
import './index.css';

setChatxivApiClient(createChatxivApiClient());
setLogger(createConsoleLogger());

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
    <ErrorBoundary>
      <GlobalErrorHandler>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </GlobalErrorHandler>
    </ErrorBoundary>
  </StrictMode>
);
