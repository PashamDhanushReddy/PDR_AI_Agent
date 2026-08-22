import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import MemoryPage from './pages/MemoryPage';

function App() {
  const isAuthenticated = !!localStorage.getItem('access_token');

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground">
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route 
            path="/chat" 
            element={isAuthenticated ? <ChatPage /> : <Navigate to="/auth" />} 
          />
          <Route 
            path="/memory" 
            element={isAuthenticated ? <MemoryPage /> : <Navigate to="/auth" />} 
          />
          <Route path="/" element={<Navigate to="/chat" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
