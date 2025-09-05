// hooks/useSDK.tsx
import { useState, useEffect, useCallback } from 'react';
import brdzSDK from '@anantla/brdz-sdk';

interface SDKState {
  sdkReady: boolean;
  isLoading: boolean;
  error: string | null;
  hasApiKey: boolean;
  hasToken: boolean;
  baseUrl: string | null;
}

interface SDKUser {
  user_id: string | null;
  username: string | null;
  email: string | null;
  isLoggedIn: boolean;
}

// Singleton pattern to prevent multiple SDK initializations
let sdkInitialized = false;
let sdkInitPromise: Promise<void> | null = null;

export const useSDK = () => {
  const [state, setState] = useState<SDKState>({
    sdkReady: false,
    isLoading: true,
    error: null,
    hasApiKey: false,
    hasToken: false,
    baseUrl: null
  });

  const [user, setUser] = useState<SDKUser>({
    user_id: null,
    username: null,
    email: null,
    isLoggedIn: false
  });

  // Initialize SDK with singleton pattern
  useEffect(() => {
    const initSDK = async () => {
      // If SDK is already initialized, just return the current state
      if (sdkInitialized) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
        const username = typeof window !== 'undefined' ? localStorage.getItem('username') : null;
        const email = typeof window !== 'undefined' ? localStorage.getItem('email') : null;
        
        setState({
          sdkReady: true,
          isLoading: false,
          error: null,
          hasApiKey: true,
          hasToken: !!token,
          baseUrl: process.env.NEXT_PUBLIC_BRDZ_API_BASE || null
        });
        
        if (token) {
          setUser({
            user_id: userId,
            username,
            email,
            isLoggedIn: true
          });
        }
        return;
      }

      // If initialization is in progress, wait for it
      if (sdkInitPromise) {
        await sdkInitPromise;
        return;
      }

      // Create new initialization promise
      sdkInitPromise = (async () => {
        try {
          console.log('🚀 Initializing BRDZ SDK...');
          setState(prev => ({ ...prev, isLoading: true, error: null }));

          // Validate environment variables
          const baseUrl = process.env.NEXT_PUBLIC_BRDZ_API_BASE;
          const apiKey = process.env.NEXT_PUBLIC_BRDZ_API_KEY;

          if (!baseUrl) {
            throw new Error('NEXT_PUBLIC_BRDZ_API_BASE environment variable is required');
          }
          if (!apiKey) {
            throw new Error('NEXT_PUBLIC_BRDZ_API_KEY environment variable is required');
          }

          // Configure SDK
          const config = brdzSDK.config;
          config.setBaseUrl(baseUrl);
          config.setApiKey(apiKey);

          console.log('🔧 SDK Base URL:', baseUrl);
          console.log('🔑 API Key loaded (first 8 chars):', apiKey.substring(0, 8) + '...');

          // Load existing session if available
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
          const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
          const username = typeof window !== 'undefined' ? localStorage.getItem('username') : null;
          const email = typeof window !== 'undefined' ? localStorage.getItem('email') : null;

          if (token) {
            config.setToken(token);
            console.log('🔐 JWT token restored from localStorage');
            
            setUser({
              user_id: userId,
              username,
              email,
              isLoggedIn: true
            });
          } else {
            console.log('⚠️ No JWT token found in localStorage');
          }

          // Validate SDK setup
          const isValid = brdzSDK.utils.validateSDKSetup();
          
          setState({
            sdkReady: true,
            isLoading: false,
            error: null,
            hasApiKey: !!apiKey,
            hasToken: !!token,
            baseUrl
          });

          console.log('✅ SDK initialized successfully');
          if (isValid) {
            console.log('✅ SDK setup validation passed');
          }

          // Mark SDK as initialized
          sdkInitialized = true;

        } catch (error: any) {
          console.error('❌ SDK initialization failed:', error);
          setState({
            sdkReady: false,
            isLoading: false,
            error: error.message || 'SDK initialization failed',
            hasApiKey: false,
            hasToken: false,
            baseUrl: null
          });
        } finally {
          sdkInitPromise = null;
        }
      })();

      await sdkInitPromise;
    };

    initSDK();
  }, []);

  // Refresh SDK token from localStorage
  const refreshToken = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      brdzSDK.config.setToken(token);
      console.log('🔄 SDK token refreshed from localStorage');
      return true;
    }
    console.log('❌ No token found to refresh');
    return false;
  }, []);

  // Login user and update session
  const login = useCallback(async (usernameOrEmail: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await brdzSDK.auth.loginUser(usernameOrEmail, password);
      
      if (response.success && response.data.token) {
        const { token, user: userData } = response.data;
        
        // Update SDK token
        brdzSDK.config.setToken(token);
        
        // Store in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token);
          localStorage.setItem('user_id', userData.id.toString());
          localStorage.setItem('username', userData.username || '');
          localStorage.setItem('email', userData.email || '');
        }
        
        // Update state
        setState(prev => ({ ...prev, hasToken: true, isLoading: false }));
        setUser({
          user_id: userData.id.toString(),
          username: userData.username,
          email: userData.email,
          isLoggedIn: true
        });
        
        console.log('✅ Login successful');
        return { success: true, data: userData };
        
      } else {
        throw new Error(response.message || 'Login failed');
      }
      
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Login failed' 
      }));
      return { success: false, error: error.message };
    }
  }, []);

  // Register new user
  const register = useCallback(async (userData: {
    email: string;
    username: string;
    password: string;
    client_alias?: string;
    country_code?: string;
    phone?: string;
  }) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await brdzSDK.auth.registerUser(userData);
      
      setState(prev => ({ ...prev, isLoading: false }));
      
      if (response.success) {
        console.log('✅ Registration successful');
        return { success: true, data: response.data };
      } else {
        throw new Error(response.message || 'Registration failed');
      }
      
    } catch (error: any) {
      console.error('❌ Registration failed:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Registration failed' 
      }));
      return { success: false, error: error.message };
    }
  }, []);

  // Update JWT token manually
  const updateToken = useCallback(async (token: string) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', token);
      }
      brdzSDK.config.setToken(token);
      setState(prev => ({ ...prev, hasToken: true }));
      console.log('🔄 Token updated successfully');
    } catch (error: any) {
      console.error('❌ Token update failed:', error);
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, []);

  // Clear session and logout
  const logout = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('username');
        localStorage.removeItem('email');
      }
      
      brdzSDK.config.setToken('');
      
      setState(prev => ({ ...prev, hasToken: false, error: null }));
      setUser({
        user_id: null,
        username: null,
        email: null,
        isLoggedIn: false
      });
      
      console.log('👋 Logout successful');
    } catch (error: any) {
      console.error('❌ Logout error:', error);
    }
  }, []);

  // Debug SDK configuration
  const debugSDK = useCallback(() => {
    console.log('🔍 SDK Debug Information:');
    brdzSDK.utils.debugHeaders();
    console.log('Current State:', state);
    console.log('Current User:', user);
  }, [state, user]);

  // Test API connectivity
  const testConnection = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Test with a simple endpoint that doesn't require auth
      const response = await brdzSDK.testnet.getChainList();
      
      setState(prev => ({ ...prev, isLoading: false }));
      
      if (response.success) {
        console.log('✅ API connection test successful');
        return { success: true, message: 'API connection working' };
      } else {
        throw new Error('API test failed');
      }
      
    } catch (error: any) {
      console.error('❌ API connection test failed:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: `API connection failed: ${error.message}` 
      }));
      return { success: false, error: error.message };
    }
  }, []);

  // Get user profile
  const getUserProfile = useCallback(async () => {
    if (!user.user_id) {
      throw new Error('User not logged in');
    }
    
    try {
      const response = await brdzSDK.auth.getUserProfile(user.user_id);
      return response;
    } catch (error: any) {
      console.error('❌ Failed to get user profile:', error);
      throw error;
    }
  }, [user.user_id]);

  // SDK module shortcuts for common operations
  const shortcuts = {
    // Wallet operations
    getWalletBalance: () => brdzSDK.wallet.getBalance(),
    getWalletHistory: () => brdzSDK.wallet.getHistory(),
    
    // Crypto wallet operations
    createCryptoWallet: (data: { wallet_name: string; user_id: number }) => 
      brdzSDK.cryptoWallet.createWallet(data),
    getUserCryptoWallets: (user_id: number) => 
      brdzSDK.cryptoWallet.getUserWallets(user_id),
    
    // MCP AI Commerce
    getMCPStats: () => brdzSDK.mcp.getDashboardStats(),
    getRecentOrders: (limit = 5) => brdzSDK.mcp.getRecentOrders({ limit }),
    
    // Transactions
    getAllTransactions: () => brdzSDK.transactions.getAll(),
    getTransactionById: (id: string) => brdzSDK.transactions.getById(id),
    
    // Cross-chain operations
    getUSDCBalance: (chain: string, address: string) => 
      brdzSDK.crosschain.getUSDCBalance(chain, address),
    
    // Testnet utilities
    getTestnetChains: () => brdzSDK.testnet.getChainList(),
    requestTestnetFaucet: (data: { wallet_id: string; currency: string; chain: string }) => 
      brdzSDK.testnet.requestFaucetTransfer(data)
  };

  return {
    // State
    ...state,
    user,
    
    // Core methods
    login,
    register,
    logout,
    updateToken,
    getUserProfile,
    refreshToken,
    
    // Utilities
    debugSDK,
    testConnection,
    
    // SDK access
    sdk: brdzSDK,
    shortcuts,
    
    // Helper getters
    get isAuthenticated() {
      return state.hasToken && user.isLoggedIn;
    },
    
    get isReady() {
      return state.sdkReady && !state.isLoading;
    },
    
    get canMakeRequests() {
      // More lenient: Allow requests if SDK is ready and we have API key
      // Don't require token initially - user might be logging in
      return state.sdkReady && state.hasApiKey && !state.isLoading;
    }
  };
};