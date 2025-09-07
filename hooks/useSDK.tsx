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

// AI Agent specific state
interface AIAgentState {
  isHealthy: boolean;
  isConfigured: boolean;
  hasActiveSession: boolean;
  lastHealthCheck: Date | null;
  serviceStatus: any;
}

// AI conversation state
interface ConversationState {
  isActive: boolean;
  currentIntent: string | null;
  requiresInput: boolean;
  requiresOnboarding: boolean;
  missingParameter: string | null;
  availableOptions: any[] | null;
  conversationHistory: any[];
}

// Type assertion for AI methods that TypeScript doesn't recognize yet
const sdkWithAI = brdzSDK as any;

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

  // AI Agent state
  const [aiState, setAIState] = useState<AIAgentState>({
    isHealthy: false,
    isConfigured: false,
    hasActiveSession: false,
    lastHealthCheck: null,
    serviceStatus: null
  });

  // Conversation state
  const [conversationState, setConversationState] = useState<ConversationState>({
    isActive: false,
    currentIntent: null,
    requiresInput: false,
    requiresOnboarding: false,
    missingParameter: null,
    availableOptions: null,
    conversationHistory: []
  });

  // Initialize SDK
  useEffect(() => {
    const initSDK = async () => {
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

        // Initialize AI Agent if user is logged in
        if (token && userId) {
          await initializeAIAgent(parseInt(userId));
        }

      } catch (error: any) {
        console.error('❌ SDK initialization failed:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error.message || 'SDK initialization failed'
        }));
      }
    };

    initSDK();
  }, []);

  // Initialize AI Agent
  const initializeAIAgent = useCallback(async (userId?: number) => {
    try {
      console.log('🤖 Initializing AI Agent...');
      
      // Check if AI methods exist before calling
      if (!sdkWithAI.cryptoWallet.checkAIHealth) {
        console.warn('⚠️ AI Agent methods not available in current SDK version');
        setAIState(prev => ({
          ...prev,
          isHealthy: false,
          isConfigured: false,
          lastHealthCheck: new Date()
        }));
        return;
      }
      
      // Check AI health
      const health = await sdkWithAI.cryptoWallet.checkAIHealth();
      
      setAIState(prev => ({
        ...prev,
        isHealthy: health.success,
        isConfigured: health.service_status?.fully_configured || false,
        lastHealthCheck: new Date(),
        serviceStatus: health.service_status
      }));

      // Check for active session if user ID provided
      if (userId && sdkWithAI.cryptoWallet.conversation) {
        try {
          const sessionStatus = await sdkWithAI.cryptoWallet.conversation.getStatus(userId);
          setAIState(prev => ({
            ...prev,
            hasActiveSession: sessionStatus.hasActive
          }));
          
          if (sessionStatus.hasActive && sessionStatus.session) {
            setConversationState(prev => ({
              ...prev,
              isActive: true,
              currentIntent: sessionStatus.session.current_intent,
            }));
          }
        } catch (error) {
          console.log('No active AI session found');
        }
      }

      console.log('✅ AI Agent initialized');
      
    } catch (error: any) {
      console.error('❌ AI Agent initialization failed:', error);
      setAIState(prev => ({
        ...prev,
        isHealthy: false,
        isConfigured: false,
        lastHealthCheck: new Date()
      }));
    }
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
        
        // Initialize AI Agent for logged in user
        await initializeAIAgent(userData.id);
        
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
  }, [initializeAIAgent]);

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

  // Check if user has valid token (for backward compatibility)
  const refreshToken = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return !!token;
  }, []);

  // Clear session and logout
  const logout = useCallback(async () => {
    try {
      // Clear AI session before logout
      if (user.user_id && sdkWithAI.cryptoWallet.clearAISession) {
        try {
          await sdkWithAI.cryptoWallet.clearAISession(parseInt(user.user_id));
        } catch (error) {
          // Ignore errors when clearing AI session on logout
        }
      }

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

      // Reset AI state
      setAIState({
        isHealthy: false,
        isConfigured: false,
        hasActiveSession: false,
        lastHealthCheck: null,
        serviceStatus: null
      });

      setConversationState({
        isActive: false,
        currentIntent: null,
        requiresInput: false,
        requiresOnboarding: false,
        missingParameter: null,
        availableOptions: null,
        conversationHistory: []
      });
      
      console.log('👋 Logout successful');
    } catch (error: any) {
      console.error('❌ Logout error:', error);
    }
  }, [user.user_id]);

  // AI Agent Methods
  const aiAgent = {
    // Check AI health
    checkHealth: useCallback(async () => {
      try {
        if (!sdkWithAI.cryptoWallet.checkAIHealth) {
          throw new Error('AI health check not available');
        }
        
        const health = await sdkWithAI.cryptoWallet.checkAIHealth();
        setAIState(prev => ({
          ...prev,
          isHealthy: health.success,
          isConfigured: health.service_status?.fully_configured || false,
          lastHealthCheck: new Date(),
          serviceStatus: health.service_status
        }));
        return health;
      } catch (error: any) {
        console.error('❌ AI health check failed:', error);
        setAIState(prev => ({
          ...prev,
          isHealthy: false,
          lastHealthCheck: new Date()
        }));
        throw error;
      }
    }, []),

    // Start new conversation
    startConversation: useCallback(async (message: string) => {
      if (!user.user_id) throw new Error('User not logged in');
      if (!sdkWithAI.cryptoWallet.conversation) {
        throw new Error('AI conversation not available');
      }
      
      try {
        const response = await sdkWithAI.cryptoWallet.conversation.start(message, parseInt(user.user_id));
        
        // Update conversation state
        if (sdkWithAI.cryptoWallet.utils?.ai?.parseResponse) {
          const parsed = sdkWithAI.cryptoWallet.utils.ai.parseResponse(response);
          if (parsed) {
            setConversationState({
              isActive: true,
              currentIntent: parsed.intent_type,
              requiresInput: parsed.requires_input,
              requiresOnboarding: parsed.requires_onboarding,
              missingParameter: parsed.missing_parameter,
              availableOptions: parsed.available_options,
              conversationHistory: [
                { role: 'user', message, timestamp: new Date() },
                { role: 'ai', message: parsed.message, timestamp: new Date() }
              ]
            });
            
            setAIState(prev => ({ ...prev, hasActiveSession: true }));
          }
        }
        
        return response;
      } catch (error: any) {
        console.error('❌ Failed to start AI conversation:', error);
        throw error;
      }
    }, [user.user_id]),

    // Continue conversation
    continueConversation: useCallback(async (message: string) => {
      if (!user.user_id) throw new Error('User not logged in');
      if (!sdkWithAI.cryptoWallet.conversation) {
        throw new Error('AI conversation not available');
      }
      
      try {
        const response = await sdkWithAI.cryptoWallet.conversation.continue(message, parseInt(user.user_id));
        
        // Update conversation state
        if (sdkWithAI.cryptoWallet.utils?.ai?.parseResponse) {
          const parsed = sdkWithAI.cryptoWallet.utils.ai.parseResponse(response);
          if (parsed) {
            setConversationState(prev => ({
              ...prev,
              currentIntent: parsed.intent_type,
              requiresInput: parsed.requires_input,
              requiresOnboarding: parsed.requires_onboarding,
              missingParameter: parsed.missing_parameter,
              availableOptions: parsed.available_options,
              conversationHistory: [
                ...prev.conversationHistory,
                { role: 'user', message, timestamp: new Date() },
                { role: 'ai', message: parsed.message, timestamp: new Date() }
              ]
            }));
            
            // If conversation completed, mark as inactive
            if (parsed.completed || parsed.cancelled) {
              setConversationState(prev => ({ ...prev, isActive: false }));
              setAIState(prev => ({ ...prev, hasActiveSession: false }));
            }
          }
        }
        
        return response;
      } catch (error: any) {
        console.error('❌ Failed to continue AI conversation:', error);
        throw error;
      }
    }, [user.user_id]),

    // End conversation
    endConversation: useCallback(async () => {
      if (!user.user_id) return;
      if (!sdkWithAI.cryptoWallet.conversation) return;
      
      try {
        await sdkWithAI.cryptoWallet.conversation.end(parseInt(user.user_id));
        
        setConversationState({
          isActive: false,
          currentIntent: null,
          requiresInput: false,
          requiresOnboarding: false,
          missingParameter: null,
          availableOptions: null,
          conversationHistory: []
        });
        
        setAIState(prev => ({ ...prev, hasActiveSession: false }));
        
        console.log('✅ AI conversation ended');
      } catch (error: any) {
        console.error('❌ Failed to end AI conversation:', error);
      }
    }, [user.user_id]),

    // Quick AI operations
    quickChat: useCallback(async (message: string) => {
      if (!user.user_id) throw new Error('User not logged in');
      if (!sdkWithAI.cryptoWallet.ai?.chat) {
        throw new Error('AI chat not available');
      }
      
      try {
        return await sdkWithAI.cryptoWallet.ai.chat(message, parseInt(user.user_id));
      } catch (error: any) {
        console.error('❌ AI quick chat failed:', error);
        throw error;
      }
    }, [user.user_id])
  };

  // Debug SDK configuration
  const debugSDK = useCallback(() => {
    console.log('🔍 SDK Debug Information:');
    brdzSDK.utils.debugHeaders();
    console.log('Current State:', state);
    console.log('Current User:', user);
    console.log('AI State:', aiState);
    console.log('Conversation State:', conversationState);
  }, [state, user, aiState, conversationState]);

  // Test API connectivity
  const testConnection = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
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
    
    // AI shortcuts
    aiCreateWallet: (message: string) => 
      user.user_id && sdkWithAI.cryptoWallet.ai?.createWallet ? 
        sdkWithAI.cryptoWallet.ai.createWallet(message, parseInt(user.user_id)) : 
        Promise.reject(new Error('Not logged in or AI not available')),
    aiListWallets: (message: string) => 
      user.user_id && sdkWithAI.cryptoWallet.ai?.listWallets ? 
        sdkWithAI.cryptoWallet.ai.listWallets(message, parseInt(user.user_id)) : 
        Promise.reject(new Error('Not logged in or AI not available')),
    aiCheckBalance: (message: string) => 
      user.user_id && sdkWithAI.cryptoWallet.ai?.checkBalance ? 
        sdkWithAI.cryptoWallet.ai.checkBalance(message, parseInt(user.user_id)) : 
        Promise.reject(new Error('Not logged in or AI not available')),
    
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
    
    // AI Agent state
    aiState,
    conversationState,
    
    // Core methods
    login,
    register,
    logout,
    updateToken,
    getUserProfile,
    
    // Backward compatibility
    refreshToken,
    
    // AI Agent methods
    aiAgent,
    
    // Utilities
    debugSDK,
    testConnection,
    
    // SDK access
    sdk: brdzSDK as any,
    shortcuts,
    
    // Helper getters
    get isAuthenticated() {
      return state.hasToken && user.isLoggedIn;
    },
    
    get isReady() {
      return state.sdkReady && !state.isLoading;
    },
    
    get canMakeRequests() {
      return state.sdkReady && state.hasApiKey && !state.isLoading;
    },

    // AI Agent helpers
    get aiReady() {
      return aiState.isHealthy && aiState.isConfigured;
    },

    get hasActiveConversation() {
      return conversationState.isActive;
    },

    get needsAIInput() {
      return conversationState.requiresInput || conversationState.requiresOnboarding;
    }
  };
};