
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Storage from './components/Storage';
import Login from './components/Login';
import Register from './components/Register';
import { ThemeProvider } from './contexts/ThemeContext';
import { SharedFilesProvider } from './contexts/SharedFilesContext';
import { NotificationProvider } from './contexts/NotificationContext';
import NotificationContainer from './components/NotificationContainer';
import './App.css';


// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? <Navigate to="/dashboard" /> : children;
};

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <SharedFilesProvider>
          <Router>
            <div className="App">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/storage" element={<ProtectedRoute><Storage /></ProtectedRoute>} />
              </Routes>
              <NotificationContainer />
            </div>
          </Router>
        </SharedFilesProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App; 