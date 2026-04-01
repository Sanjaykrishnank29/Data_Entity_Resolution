import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import DataIngestion from './pages/DataIngestion';
import DataExplorer from './pages/DataExplorer';
import IntelligenceHub from './pages/IntelligenceHub';
import LiveMonitoring from './pages/LiveMonitoring';
import CommandCenter from './pages/CommandCenter';
import ChatAssistant from './components/ChatAssistant';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogout = () => setIsLoggedIn(false);

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto relative">
          <div className="p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/ingest" replace />} />
              <Route path="/ingest" element={<DataIngestion />} />
              <Route path="/explorer" element={<DataExplorer />} />
              <Route path="/intelligence" element={<IntelligenceHub />} />
              <Route path="/monitor" element={<LiveMonitoring />} />
              <Route path="/command" element={<CommandCenter />} />
              {/* Legacy redirects */}
              <Route path="/dashboard" element={<Navigate to="/command" replace />} />
              <Route path="/live-monitor" element={<Navigate to="/monitor" replace />} />
              <Route path="/query" element={<Navigate to="/explorer" replace />} />
              <Route path="/review-queue" element={<Navigate to="/intelligence" replace />} />
              <Route path="/records" element={<Navigate to="/explorer" replace />} />
              <Route path="/golden-table" element={<Navigate to="/explorer" replace />} />
              <Route path="/identity-graph" element={<Navigate to="/command" replace />} />
              <Route path="/audit" element={<Navigate to="/monitor" replace />} />
            </Routes>
          </div>
        </main>
        {/* Global Floating Chat Assistant */}
        <ChatAssistant />
      </div>
    </Router>
  );
}

export default App;
