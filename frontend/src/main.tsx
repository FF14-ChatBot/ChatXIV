import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import {
  setAnalytics,
  createPostHogAnalytics,
  createNoopAnalytics,
  setLogger,
  createConsoleLogger,
  logger,
} from './lib';
import App from './App';
import './index.css';

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
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
