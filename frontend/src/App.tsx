import { Navigate, Route } from 'react-router-dom';
import { FaroRoutes } from '@grafana/faro-react';
import { AnalyticsPageView } from './lib/analytics/AnalyticsPageView';
import { AppShell } from './components/AppShell/AppShell';
import { MainLayout } from './components/MainLayout/MainLayout';
import { NotAvailablePage } from './components/NotAvailablePage/NotAvailablePage';
import { ProductNavigationProvider } from './context/ProductNavigationContext';
import { LoginPage } from './features/auth/LoginPage';
import { ChatPage } from './features/chat/ChatPage';

export type AppProps = {
  readonly isProductLive: boolean;
};

export default function App({ isProductLive }: AppProps) {
  const blockMain = !isProductLive;
  const showHomeLink = isProductLive;
  const homeHref = blockMain ? '/unavailable' : '/';

  return (
    <>
      <AnalyticsPageView />
      <ProductNavigationProvider homeHref={homeHref}>
        <FaroRoutes>
          <Route
            path="/unavailable"
            element={
              <AppShell>
                <NotAvailablePage showHomeLink={showHomeLink} />
              </AppShell>
            }
          />
          <Route
            path="/login"
            element={
              <AppShell>
                <LoginPage />
              </AppShell>
            }
          />
          <Route
            path="/"
            element={
              blockMain ? (
                <Navigate to="/unavailable" replace />
              ) : (
                <MainLayout>
                  <ChatPage />
                </MainLayout>
              )
            }
          />
          <Route path="*" element={<Navigate to="/unavailable" replace />} />
        </FaroRoutes>
      </ProductNavigationProvider>
    </>
  );
}
