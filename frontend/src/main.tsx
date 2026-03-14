import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary, GlobalErrorHandler } from './components';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <GlobalErrorHandler>
        <App />
      </GlobalErrorHandler>
    </ErrorBoundary>
  </StrictMode>
);
