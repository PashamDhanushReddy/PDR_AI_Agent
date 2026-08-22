import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import MemoryPage from './pages/MemoryPage';

import React from 'react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = !!localStorage.getItem('access_token');
  return isAuthenticated ? children : <Navigate to="/auth" />;
}

import { useTheme } from './hooks/useTheme';

function App() {
  useTheme();
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen bg-background text-foreground">
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route 
            path="/chat" 
            element={<ProtectedRoute><ChatPage /></ProtectedRoute>} 
          />
          <Route 
            path="/memory" 
            element={<ProtectedRoute><MemoryPage /></ProtectedRoute>} 
          />
          <Route path="/" element={<Navigate to="/chat" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
