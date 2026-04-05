import { Navigate, Route } from 'react-router-dom';
import { FaroRoutes } from '@grafana/faro-react';
import { AnalyticsPageView } from './lib/analytics/AnalyticsPageView';
import { AppShell } from './components/AppShell/AppShell';
import { MainLayout } from './components/MainLayout/MainLayout';
import { NotAvailablePage } from './components/NotAvailablePage/NotAvailablePage';
import { ProductNavigationProvider } from './context/ProductNavigationContext';
import { LoginPage } from './features/auth/LoginPage';
import { ChatPage } from './features/chat/ChatPage';
import { APP_ROUTES } from './lib/appRoutes';

export type AppProps = {
  readonly isProductLive: boolean;
};

export default function App({ isProductLive }: AppProps) {
  const blockMain = !isProductLive;
  const showHomeLink = isProductLive;
  const homeHref = blockMain ? APP_ROUTES.UNAVAILABLE : APP_ROUTES.HOME;

  return (
    <>
      <AnalyticsPageView />
      <ProductNavigationProvider homeHref={homeHref}>
        <FaroRoutes>
          <Route
            path={APP_ROUTES.UNAVAILABLE}
            element={
              <AppShell>
                <NotAvailablePage showHomeLink={showHomeLink} />
              </AppShell>
            }
          />
          <Route
            path={APP_ROUTES.LOGIN}
            element={
              <AppShell>
                <LoginPage />
              </AppShell>
            }
          />
          <Route
            path={APP_ROUTES.HOME}
            element={
              blockMain ? (
                <Navigate to={APP_ROUTES.UNAVAILABLE} replace />
              ) : (
                <MainLayout>
                  <ChatPage />
                </MainLayout>
              )
            }
          />
          <Route path="*" element={<Navigate to={APP_ROUTES.UNAVAILABLE} replace />} />
        </FaroRoutes>
      </ProductNavigationProvider>
    </>
  );
}
