import { Navigate, Route, Routes } from 'react-router-dom';
import { AnalyticsPageView } from './lib/analytics/AnalyticsPageView';
import { MainLayout } from './components/MainLayout/MainLayout';
import { ChatPage } from './features/chat/ChatPage';
import { NotAvailablePage } from './components/NotAvailablePage/NotAvailablePage';

export type AppProps = {
  readonly isProductLive: boolean;
};

export default function App({ isProductLive }: AppProps) {
  const blockMain = !isProductLive;
  const showHomeLink = isProductLive;

  return (
    <>
      <AnalyticsPageView />
      <Routes>
        <Route path="/unavailable" element={<NotAvailablePage showHomeLink={showHomeLink} />} />
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
      </Routes>
    </>
  );
}
