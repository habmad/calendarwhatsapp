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

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('/auth/status');
      if (response.data.authenticated) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      const response = await axios.get('/auth/google');
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
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

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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