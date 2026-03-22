import { Navigate, Route, Routes } from 'react-router-dom';
import { isPrelaunchRedirectEnabled } from './config/appEnv';
import { AnalyticsPageView } from './lib/analytics/AnalyticsPageView';
import { MainLayout } from './components/MainLayout/MainLayout';
import { ChatPage } from './features/chat/ChatPage';
import { NotAvailablePage } from './components/NotAvailablePage/NotAvailablePage';

function App() {
  const prelaunch = isPrelaunchRedirectEnabled();

  return (
    <>
      <AnalyticsPageView />
      <Routes>
        <Route path="/unavailable" element={<NotAvailablePage />} />
        <Route
          path="/"
          element={
            prelaunch ? (
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

export default App;
