import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

interface User {
  username: string;
  tenant: {
    id: string;
    name: string;
  } | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, tenantId?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Try to get user info from token
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // For now, we'll just set a basic user object
        // In a real app, you might want to validate the token with the server
        setUser({
          username: payload.username,
          tenant: null // Will be set when tenant is selected
        });
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string, tenantId?: string) => {
    const response = await api.post('/auth/login', {
      username,
      password,
      tenantId,
    });

    const { token, user } = response.data;
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}