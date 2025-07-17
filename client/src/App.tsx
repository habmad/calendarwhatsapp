import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';

// Configure axios to include credentials for session handling
axios.defaults.withCredentials = true;

// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import Layout from './components/Layout';

// Context
import { AuthContext } from './context/AuthContext';

// Types
interface User {
  id: number;
  email: string;
  name: string;
  picture?: string;
  whatsapp_recipient: string;
  automation_enabled: boolean;
  daily_summary_time: string;
  timezone: string;
}

interface AuthContextType {
  user: User | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

// Callback component to handle OAuth redirect
const AuthCallback: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get<{ authenticated: boolean; user?: User }>('/auth/status');
        if (response.data.authenticated && response.data.user) {
          // Redirect to dashboard after successful auth
          window.location.href = '/dashboard';
        } else {
          setError('Authentication failed');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setError('Authentication check failed');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="btn-primary"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
};

function App(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const location = useLocation();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Check auth status when location changes (handles OAuth redirect)
  useEffect(() => {
    // Check auth status when navigating to dashboard or when user is null
    if ((location.pathname === '/dashboard' && !user) || location.pathname === '/dashboard') {
      checkAuthStatus();
    }
  }, [location.pathname, user]);

  const checkAuthStatus = async (): Promise<void> => {
    try {
      console.log('[Frontend] Checking auth status...');
      const response = await axios.get<{ authenticated: boolean; user?: User }>('/auth/status');
      console.log('[Frontend] Auth response:', response.data);
      
      if (response.data.authenticated && response.data.user) {
        console.log('[Frontend] User authenticated:', response.data.user);
        setUser(response.data.user);
      } else {
        console.log('[Frontend] User not authenticated');
        setUser(null);
      }
    } catch (error) {
      console.error('[Frontend] Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (): Promise<void> => {
    try {
      const response = await axios.get<{ authUrl: string }>('/auth/google');
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await axios.post('/auth/logout');
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const authContextValue: AuthContextType = {
    user,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      <Routes>
        <Route 
          path="/" 
          element={user ? <Navigate to="/dashboard" /> : <Login />} 
        />
        <Route 
          path="/auth/callback" 
          element={<AuthCallback />} 
        />
        <Route 
          path="/dashboard" 
          element={user ? <Layout><Dashboard /></Layout> : <Navigate to="/" />} 
        />
        <Route 
          path="/settings" 
          element={user ? <Layout><Settings /></Layout> : <Navigate to="/" />} 
        />
        <Route 
          path="/debug" 
          element={
            <div className="p-4">
              <h1>Debug Info</h1>
              <button 
                onClick={async () => {
                  try {
                    const response = await axios.get('/auth/debug-session');
                    console.log('Debug session:', response.data);
                    alert(JSON.stringify(response.data, null, 2));
                  } catch (error) {
                    console.error('Debug error:', error);
                    alert('Error: ' + error);
                  }
                }}
                className="btn-primary mb-4"
              >
                Check Session
              </button>
              <button 
                onClick={async () => {
                  try {
                    const response = await axios.get('/auth/status');
                    console.log('Auth status:', response.data);
                    alert(JSON.stringify(response.data, null, 2));
                  } catch (error) {
                    console.error('Auth status error:', error);
                    alert('Error: ' + error);
                  }
                }}
                className="btn-primary"
              >
                Check Auth Status
              </button>
            </div>
          } 
        />
      </Routes>
    </AuthContext.Provider>
  );
}

export default App; 