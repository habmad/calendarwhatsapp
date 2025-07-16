import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

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

function App(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async (): Promise<void> => {
    try {
      const response = await axios.get<{ authenticated: boolean; user?: User }>('/auth/status');
      if (response.data.authenticated && response.data.user) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
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
          path="/dashboard" 
          element={user ? <Layout><Dashboard /></Layout> : <Navigate to="/" />} 
        />
        <Route 
          path="/settings" 
          element={user ? <Layout><Settings /></Layout> : <Navigate to="/" />} 
        />
      </Routes>
    </AuthContext.Provider>
  );
}

export default App; 