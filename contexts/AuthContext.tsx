//Path: contexts/AuthContext.tsx

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  user_id: string; // Changed to string for SDK compatibility
  id?: number; // Keep number version for backward compatibility
  email: string;
  username: string;
  phone?: string;
  ekyc_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  client_id?: string;
  country_code?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  ekycStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface AuthContextType extends AuthState {
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateEkycStatus: (status: 'PENDING' | 'APPROVED' | 'REJECTED') => void;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    ekycStatus: 'PENDING',
  });

  useEffect(() => {
    // Check for stored auth data on mount
    checkStoredAuth();
  }, []);

  const checkStoredAuth = () => {
    try {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');
      
      // Also check individual storage items (SDK format)
      const userId = localStorage.getItem('user_id');
      const username = localStorage.getItem('username');
      const email = localStorage.getItem('email');
      
      if (token && userData) {
        // Check if token is expired
        const tokenTimestamp = localStorage.getItem('token_timestamp');
        const tokenAge = tokenTimestamp ? Date.now() - parseInt(tokenTimestamp) : 0;
        const maxTokenAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (tokenAge > maxTokenAge) {
          console.log('🔐 Stored token expired, clearing auth data');
          localStorage.clear();
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
        
        // Use stored user_data if available
        const user = JSON.parse(userData);
        setState({
          user: normalizeUser(user),
          token,
          isAuthenticated: true,
          isLoading: false,
          ekycStatus: user.ekyc_status || 'PENDING',
        });
      } else if (token && userId && email) {
        // Reconstruct user from individual items (SDK format)
        const user: User = {
          user_id: userId,
          id: parseInt(userId) || undefined,
          email,
          username: username || '',
          ekyc_status: 'PENDING'
        };
        
        setState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          ekycStatus: 'PENDING',
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error checking stored auth:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const normalizeUser = (user: any): User => {
    // Ensure user_id is string and add id as number
    return {
      ...user,
      user_id: user.user_id?.toString() || user.id?.toString() || '',
      id: typeof user.user_id === 'number' ? user.user_id : 
          typeof user.id === 'number' ? user.id : 
          parseInt(user.user_id) || parseInt(user.id) || undefined
    };
  };

  const login = async (token: string, user: User) => {
    try {
      const normalizedUser = normalizeUser(user);
      
      // Store in both formats for compatibility
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(normalizedUser));
      localStorage.setItem('token_timestamp', Date.now().toString());
      
      // Store individual items for SDK compatibility
      localStorage.setItem('user_id', normalizedUser.user_id);
      localStorage.setItem('username', normalizedUser.username);
      localStorage.setItem('email', normalizedUser.email);
      
      setState({
        user: normalizedUser,
        token,
        isAuthenticated: true,
        isLoading: false,
        ekycStatus: normalizedUser.ekyc_status || 'PENDING',
      });
      
      console.log('✅ User logged in:', normalizedUser);
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear all auth-related localStorage items
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('token_timestamp');
      localStorage.removeItem('user_id');
      localStorage.removeItem('username');
      localStorage.removeItem('email');
      
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        ekycStatus: 'PENDING',
      });
      
      console.log('👋 User logged out');
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  };

  const updateEkycStatus = (status: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    setState(prev => ({ ...prev, ekycStatus: status }));
    if (state.user) {
      const updatedUser = { ...state.user, ekyc_status: status };
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
      setState(prev => ({ ...prev, user: updatedUser }));
    }
  };

  const refreshUserProfile = async () => {
    // This can be implemented to refresh user profile from API
    // For now, just reload from localStorage
    checkStoredAuth();
  };

  return (
    <AuthContext.Provider value={{ 
      ...state, 
      login, 
      logout, 
      updateEkycStatus,
      refreshUserProfile 
    }}>
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

export function useRequireAuth() {
  const { isAuthenticated, ekycStatus, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        console.log('🔐 Redirecting to login - not authenticated');
        router.push('/auth/login');
      } else if (ekycStatus !== 'APPROVED') {
        console.log('📋 Redirecting to eKYC - status:', ekycStatus);
        router.push('/ekyc');
      }
    }
  }, [isAuthenticated, ekycStatus, isLoading, router]);

  return { isAuthenticated, ekycStatus, isLoading };
}

export function useOptionalAuth() {
  const { isAuthenticated, ekycStatus, isLoading, user } = useAuth();
  
  return { 
    isAuthenticated, 
    ekycStatus, 
    isLoading, 
    user,
    isFullyAuthenticated: isAuthenticated && ekycStatus === 'APPROVED'
  };
}