import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';

// Configure axios to call Railway backend directly
if (process.env.NODE_ENV === 'production') {
  axios.defaults.baseURL = 'https://calendarwhatsapp-production.up.railway.app';
  axios.defaults.withCredentials = true;
}

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
      console.log('[Frontend] ===== Starting OAuth Login =====');
      console.log('[Frontend] Current URL:', window.location.href);
      console.log('[Frontend] Axios baseURL:', axios.defaults.baseURL);
      console.log('[Frontend] Axios withCredentials:', axios.defaults.withCredentials);
      
      console.log('[Frontend] Making request to /auth/google...');
      const response = await axios.get<{ authUrl: string }>('/auth/google');
      console.log('[Frontend] OAuth response status:', response.status);
      console.log('[Frontend] OAuth response data:', response.data);
      console.log('[Frontend] OAuth response headers:', response.headers);
      
      if (!response.data.authUrl) {
        console.error('[Frontend] No authUrl in response');
        alert('OAuth URL not received from server');
        return;
      }
      
      console.log('[Frontend] Redirecting to:', response.data.authUrl);
      console.log('[Frontend] ===== End OAuth Login =====');
      window.location.href = response.data.authUrl;
    } catch (error: any) {
      console.error('[Frontend] Login failed:', error);
      console.error('[Frontend] Error response:', error.response?.data);
      console.error('[Frontend] Error status:', error.response?.status);
      console.error('[Frontend] Error headers:', error.response?.headers);
      alert('Login failed: ' + (error.response?.data?.error || error.message));
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
                className="btn-primary mb-4"
              >
                Check Auth Status
              </button>
              <button 
                onClick={async () => {
                  try {
                    const response = await axios.get('/auth/test-session');
                    console.log('Test session created:', response.data);
                    alert(JSON.stringify(response.data, null, 2));
                  } catch (error) {
                    console.error('Test session error:', error);
                    alert('Error: ' + error);
                  }
                }}
                className="btn-primary mb-4"
              >
                Create Test Session
              </button>
              <button 
                onClick={async () => {
                  try {
                    const response = await axios.get('/auth/test-session-check');
                    console.log('Test session check:', response.data);
                    alert(JSON.stringify(response.data, null, 2));
                  } catch (error) {
                    console.error('Test session check error:', error);
                    alert('Error: ' + error);
                  }
                }}
                className="btn-primary mb-4"
              >
                Check Test Session
              </button>
              <button 
                onClick={async () => {
                  try {
                    // Get OAuth URL
                    const authResponse = await axios.get('/auth/google');
                    const authUrl = authResponse.data.authUrl;
                    
                    // Open Google OAuth in popup
                    const popup = window.open(authUrl, 'google-oauth', 'width=500,height=600');
                    
                    // Listen for the callback
                    const checkClosed = setInterval(() => {
                      if (popup?.closed) {
                        clearInterval(checkClosed);
                        // Try to get the code from the popup URL
                        // This is a simplified approach
                        alert('OAuth popup closed. Check console for details.');
                      }
                    }, 1000);
                    
                  } catch (error) {
                    console.error('OAuth error:', error);
                    alert('Error: ' + error);
                  }
                }}
                className="btn-primary mb-4"
              >
                Test OAuth Flow
              </button>
              <button 
                onClick={async () => {
                  try {
                    console.log('[Test] Testing /auth/google endpoint...');
                    const response = await axios.get('/auth/google');
                    console.log('[Test] Response:', response.data);
                    alert(JSON.stringify(response.data, null, 2));
                  } catch (error) {
                    console.error('[Test] Error:', error);
                    alert('Error: ' + error);
                  }
                }}
                className="btn-primary"
              >
                Test /auth/google Endpoint
              </button>
            </div>
          } 
        />
      </Routes>
    </AuthContext.Provider>
  );
}

export default App; 