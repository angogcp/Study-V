import React, { createContext, useContext, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { User } from '@/types';
import { AuthService } from '@/services/auth.service';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, gradeLevel: '初中1' | '初中2' | '初中3') => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    const initAuth = async () => {
      const token = Cookies.get('auth_token');
      const userData = Cookies.get('user_data');
      
      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          // Optionally refresh user data from server
          await refreshUser();
        } catch (error) {
          console.error('Failed to parse user data:', error);
          logout();
        }
      }
      
      setIsLoading(false);
    };
    
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { user, token } = await AuthService.login(email, password);
      
      // Store token and user data
      Cookies.set('auth_token', token, { expires: 7 }); // 7 days
      Cookies.set('user_data', JSON.stringify(user), { expires: 7 });
      
      setUser(user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, fullName: string, gradeLevel: '初中1' | '初中2' | '初中3') => {
    try {
      const { user, token } = await AuthService.register(email, password, fullName, gradeLevel);
      
      // Store token and user data
      Cookies.set('auth_token', token, { expires: 7 }); // 7 days
      Cookies.set('user_data', JSON.stringify(user), { expires: 7 });
      
      setUser(user);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    Cookies.remove('auth_token');
    Cookies.remove('user_data');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const userProfile = await AuthService.getProfile();
      setUser(userProfile);
      Cookies.set('user_data', JSON.stringify(userProfile), { expires: 7 });
    } catch (error) {
      console.error('Failed to refresh user:', error);
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};