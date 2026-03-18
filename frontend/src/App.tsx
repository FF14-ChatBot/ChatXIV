import { Routes, Route } from 'react-router-dom';
import { AnalyticsPageView } from './lib/analytics/AnalyticsPageView';

function Home() {
  return (
    <main>
      <h1>ChatXIV</h1>
      <p>Please ask me anything related to FFXIV.</p>
    </main>
  );
}

function App() {
  return (
    <>
      <AnalyticsPageView />
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </>
  );
}

export default App;
