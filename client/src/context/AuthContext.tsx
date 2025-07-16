import { createContext, useContext } from 'react';

// Types
export interface User {
  id: number;
  email: string;
  name: string;
  picture?: string;
  whatsapp_recipient: string;
  automation_enabled: boolean;
  daily_summary_time: string;
  timezone: string;
}

export interface AuthContextType {
  user: User | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 