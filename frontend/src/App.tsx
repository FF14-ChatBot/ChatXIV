import { Routes, Route } from 'react-router-dom';
import { AnalyticsPageView } from './lib/analytics/AnalyticsPageView';
import { MainLayout } from './components/MainLayout/MainLayout';
import { ChatPage } from './components/ChatPage/ChatPage';

function App() {
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
