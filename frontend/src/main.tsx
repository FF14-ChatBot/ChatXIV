import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setChatxivApiClient, createChatxivApiClient } from './clients';
import { ErrorBoundary, GlobalErrorHandler } from './components';
import App from './App';
import './index.css';

setChatxivApiClient(createChatxivApiClient());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <GlobalErrorHandler>
        <App />
      </GlobalErrorHandler>
    </ErrorBoundary>
  </StrictMode>
);
