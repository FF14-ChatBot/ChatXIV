import { Navigate, Route, Routes } from 'react-router-dom';
import { isPrelaunchRedirectEnabled } from './config/appEnv';
import { AnalyticsPageView } from './lib/analytics/AnalyticsPageView';
import { MainLayout } from './components/MainLayout/MainLayout';
import { ChatPage } from './features/chat/ChatPage';
import { NotAvailablePage } from './components/NotAvailablePage/NotAvailablePage';

function App() {
  if (isPrelaunchRedirectEnabled()) {
    return (
      <>
        <AnalyticsPageView />
        <Routes>
          <Route path="/unavailable" element={<NotAvailablePage />} />
          <Route path="*" element={<Navigate to="/unavailable" replace />} />
        </Routes>
      </>
    );
  }

  return (
    <>
      <AnalyticsPageView />
      <Routes>
        <Route
          path="/"
          element={
            <MainLayout>
              <ChatPage />
            </MainLayout>
          }
        />
      </Routes>
    </>
  );
}

export default App;
