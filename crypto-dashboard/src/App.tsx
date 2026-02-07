import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

const Home = lazy(() => import('./pages/Home'));
const Markets = lazy(() => import('./pages/Markets'));
const CoinPage = lazy(() => import('./pages/CoinPage'));

const App = () => {
  return (
    <Router>
      <Layout>
        <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh] text-neon-cyan animate-pulse font-bold tracking-widest uppercase">Initializing NeonX...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/markets" element={<Markets />} />
            <Route path="/coin/:id" element={<CoinPage />} />
            <Route path="/portfolio" element={<div className="text-center py-20 text-gray-500">Portfolio module under development...</div>} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
};

export default App;
