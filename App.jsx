import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import LiveTracking from './pages/LiveTracking';
import RoutesPage from './pages/Routes';
import Drivers from './pages/Drivers';
import Cities from './pages/Cities';
import Algorithms from './pages/Algorithms';
import Statistics from './pages/Statistics';
import ApiStatus from './pages/ApiStatus';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/live-tracking" element={<LiveTracking />} />
              <Route path="/routes" element={<RoutesPage />} />
              <Route path="/drivers" element={<Drivers />} />
              <Route path="/cities" element={<Cities />} />
              <Route path="/algorithms" element={<Algorithms />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/api-status" element={<ApiStatus />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;