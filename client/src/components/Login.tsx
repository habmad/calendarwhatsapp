import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, MessageCircle, Zap } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-md w-full mx-4">
        <div className="card text-center">
          {/* Logo and Title */}
          <div className="mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center">
                <Calendar className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              GCal WhatsApp
            </h1>
            <p className="text-gray-600">
              Automate your calendar summaries via WhatsApp
            </p>
          </div>

          {/* Features */}
          <div className="mb-8 space-y-4">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-primary-600" />
              <span className="text-gray-700">Connect your Google Calendar</span>
            </div>
            <div className="flex items-center space-x-3">
              <MessageCircle className="w-5 h-5 text-success-600" />
              <span className="text-gray-700">Receive daily summaries via WhatsApp</span>
            </div>
            <div className="flex items-center space-x-3">
              <Zap className="w-5 h-5 text-warning-600" />
              <span className="text-gray-700">Real-time change notifications</span>
            </div>
          </div>

          {/* Login Button */}
          <button
            onClick={login}
            className="w-full btn-primary flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Info */}
          <div className="mt-6 text-sm text-gray-500">
            <p>
              By continuing, you agree to allow this app to access your Google Calendar
              and send WhatsApp messages on your behalf.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 