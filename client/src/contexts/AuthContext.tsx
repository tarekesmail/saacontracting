import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'READ_ONLY';
  tenant: {
    id: string;
    name: string;
  } | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, tenantId?: string) => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // Check if token is expired
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          console.log('Token expired, clearing...');
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
          setLoading(false);
          return;
        }
        
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        // Set user object from token payload
        setUser({
          id: payload.id,
          username: payload.username,
          name: payload.name || payload.username, // Fallback to username if name not available
          email: payload.email || '',
          role: payload.role || 'READ_ONLY',
          tenant: payload.tenantId ? {
            id: payload.tenantId,
            name: payload.tenantName || 'Selected Tenant'
          } : null
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

  const switchTenant = async (tenantId: string) => {
    const response = await api.post('/auth/switch-tenant', {
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
    <AuthContext.Provider value={{ user, loading, login, switchTenant, logout }}>
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