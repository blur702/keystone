import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Use relative path for production, absolute for development
const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api'
);

// Configure axios defaults
axios.defaults.baseURL = API_URL;

// Add token to requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const decodeToken = (token: string): User | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        userId: payload.userId,
        email: payload.email,
        roles: payload.roles || [],
        permissions: payload.permissions || []
      };
    } catch {
      return null;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/auth/login', { email, password });
      const { token, refreshToken, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      
      const decodedUser = decodeToken(token);
      setUser(decodedUser);
      
      // Set up token refresh
      setupTokenRefresh();
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
    } catch {
      // Continue with logout even if API call fails
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  const refreshToken = async () => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (!storedRefreshToken) throw new Error('No refresh token');

      const response = await axios.post('/auth/refresh', {
        refreshToken: storedRefreshToken
      });

      const { token, refreshToken: newRefreshToken } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', newRefreshToken);
      
      const decodedUser = decodeToken(token);
      setUser(decodedUser);
    } catch (error) {
      // If refresh fails, logout
      await logout();
      throw error;
    }
  };

  const setupTokenRefresh = () => {
    // Refresh token every 10 minutes
    const interval = setInterval(async () => {
      try {
        await refreshToken();
      } catch {
        // Handled in refreshToken
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        const decodedUser = decodeToken(token);
        if (decodedUser) {
          setUser(decodedUser);
          setupTokenRefresh();
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};