// hooks/useSDK.tsx - FIXED VERSION
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
  methodsAvailable: boolean; // NEW: Track if AI methods exist
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

// FIXED: Safe type assertion with method existence checking
const getSafeAI = () => {
  const sdk = brdzSDK as any;
  return {
    hasAI: !!(sdk.cryptoWallet?.processAIIntent || sdk.cryptoWallet?.ai?.chat),
    hasConversation: !!(sdk.cryptoWallet?.conversation),
    hasHealth: !!(sdk.cryptoWallet?.checkAIHealth),
    hasClearSession: !!(sdk.cryptoWallet?.clearAISession),
    sdk
  };
};

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

  // AI Agent state - Enhanced with method tracking
  const [aiState, setAIState] = useState<AIAgentState>({
    isHealthy: false,
    isConfigured: false,
    hasActiveSession: false,
    lastHealthCheck: null,
    serviceStatus: null,
    methodsAvailable: false
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

  // FIXED: Enhanced AI method checker
  const checkAIMethodsAvailable = useCallback(() => {
    const ai = getSafeAI();
    console.log('[AI Check] Method availability:', {
      hasAI: ai.hasAI,
      hasConversation: ai.hasConversation,
      hasHealth: ai.hasHealth,
      hasClearSession: ai.hasClearSession
    });
    return ai;
  }, []);

  // Initialize SDK
  useEffect(() => {
    const initSDK = async () => {
      try {
        console.log('Initializing BRDZ SDK...');
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

        console.log('SDK Base URL:', baseUrl);
        console.log('API Key loaded (first 8 chars):', apiKey.substring(0, 8) + '...');

        // Load existing session if available
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
        const username = typeof window !== 'undefined' ? localStorage.getItem('username') : null;
        const email = typeof window !== 'undefined' ? localStorage.getItem('email') : null;

        if (token) {
          config.setToken(token);
          console.log('JWT token restored from localStorage');
          
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

        console.log('SDK initialized successfully');
        if (isValid) {
          console.log('SDK setup validation passed');
        }

        // FIXED: Check AI methods availability
        const ai = checkAIMethodsAvailable();
        setAIState(prev => ({
          ...prev,
          methodsAvailable: ai.hasAI || ai.hasConversation
        }));

        // Initialize AI Agent if user is logged in and methods available
        if (token && userId && (ai.hasAI || ai.hasConversation)) {
          await initializeAIAgent(parseInt(userId));
        }

      } catch (error: any) {
        console.error('SDK initialization failed:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error.message || 'SDK initialization failed'
        }));
      }
    };

    initSDK();
  }, [checkAIMethodsAvailable]);

  // FIXED: Enhanced AI Agent initialization with proper error handling
  const initializeAIAgent = useCallback(async (userId?: number) => {
    try {
      console.log('Initializing AI Agent...');
      
      const ai = getSafeAI();
      
      // Check if AI methods exist
      if (!ai.hasAI && !ai.hasConversation && !ai.hasHealth) {
        console.warn('AI Agent methods not available in current SDK version');
        setAIState(prev => ({
          ...prev,
          isHealthy: false,
          isConfigured: false,
          methodsAvailable: false,
          lastHealthCheck: new Date()
        }));
        return;
      }
      
      setAIState(prev => ({ ...prev, methodsAvailable: true }));
      
      // FIXED: Only check health if method exists
      if (ai.hasHealth) {
        try {
          const health = await ai.sdk.cryptoWallet.checkAIHealth();
          
          setAIState(prev => ({
            ...prev,
            isHealthy: health.success,
            isConfigured: health.service_status?.fully_configured || false,
            lastHealthCheck: new Date(),
            serviceStatus: health.service_status
          }));
          
          console.log('AI Health Check Result:', health);
        } catch (healthError: any) {
          console.warn('AI health check failed:', healthError.message);
          setAIState(prev => ({
            ...prev,
            isHealthy: false,
            isConfigured: false,
            lastHealthCheck: new Date()
          }));
        }
      }

      // FIXED: Only check session if methods exist and user ID provided
      if (userId && ai.hasConversation) {
        try {
          const sessionStatus = await ai.sdk.cryptoWallet.conversation.getStatus(userId);
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
        } catch (sessionError: any) {
          console.log('No active AI session found or session check failed:', sessionError.message);
          // Don't treat this as an error - just means no active session
        }
      }

      console.log('AI Agent initialized');
      
    } catch (error: any) {
      console.error('AI Agent initialization failed:', error);
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
        
        console.log('Login successful');
        return { success: true, data: userData };
        
      } else {
        throw new Error(response.message || 'Login failed');
      }
      
    } catch (error: any) {
      console.error('Login failed:', error);
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
        console.log('Registration successful');
        return { success: true, data: response.data };
      } else {
        throw new Error(response.message || 'Registration failed');
      }
      
    } catch (error: any) {
      console.error('Registration failed:', error);
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
      console.log('Token updated successfully');
    } catch (error: any) {
      console.error('Token update failed:', error);
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, []);

  // Check if user has valid token (for backward compatibility)
  const refreshToken = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return !!token;
  }, []);

  // FIXED: Enhanced logout with proper AI session cleanup
  const logout = useCallback(async () => {
    try {
      // Clear AI session before logout if methods are available
      if (user.user_id && aiState.methodsAvailable) {
        const ai = getSafeAI();
        if (ai.hasClearSession) {
          try {
            await ai.sdk.cryptoWallet.clearAISession(parseInt(user.user_id));
            console.log('AI session cleared successfully');
          } catch (error: any) {
            console.log('AI session clear failed (non-critical):', error.message);
            // Ignore errors when clearing AI session on logout
          }
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
        serviceStatus: null,
        methodsAvailable: false
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
      
      console.log('Logout successful');
    } catch (error: any) {
      console.error('Logout error:', error);
    }
  }, [user.user_id, aiState.methodsAvailable]);

  // FIXED: Enhanced AI Agent Methods with proper error handling
  const aiAgent = {
    // Check AI health with method existence validation
    checkHealth: useCallback(async () => {
      try {
        const ai = getSafeAI();
        
        if (!ai.hasHealth) {
          throw new Error('AI health check method not available in current SDK version');
        }
        
        const health = await ai.sdk.cryptoWallet.checkAIHealth();
        setAIState(prev => ({
          ...prev,
          isHealthy: health.success,
          isConfigured: health.service_status?.fully_configured || false,
          lastHealthCheck: new Date(),
          serviceStatus: health.service_status
        }));
        return health;
      } catch (error: any) {
        console.error('AI health check failed:', error);
        setAIState(prev => ({
          ...prev,
          isHealthy: false,
          lastHealthCheck: new Date()
        }));
        throw error;
      }
    }, []),

    // FIXED: Start new conversation with proper fallback
    startConversation: useCallback(async (message: string) => {
      if (!user.user_id) throw new Error('User not logged in');
      
      const ai = getSafeAI();
      
      // Method 1: Try conversation.start if available
      if (ai.hasConversation) {
        try {
          console.log('Using conversation.start method');
          const response = await ai.sdk.cryptoWallet.conversation.start(message, parseInt(user.user_id));
          
          // Update conversation state
          updateConversationState(response, message);
          return response;
        } catch (error: any) {
          console.warn('conversation.start failed, trying fallback:', error.message);
          // Continue to fallback
        }
      }
      
      // Method 2: Fallback to processAIIntent
      if (ai.hasAI) {
        try {
          console.log('Using processAIIntent fallback');
          const response = await ai.sdk.cryptoWallet.processAIIntent({
            user_input: message,
            user_id: parseInt(user.user_id),
            context: {}
          });
          
          updateConversationState(response, message);
          return response;
        } catch (error: any) {
          console.error('processAIIntent fallback failed:', error.message);
          throw error;
        }
      }
      
      throw new Error('No AI conversation methods available');
    }, [user.user_id]),

    // FIXED: Continue conversation with proper fallback
    continueConversation: useCallback(async (message: string) => {
      if (!user.user_id) throw new Error('User not logged in');
      
      const ai = getSafeAI();
      
      // Method 1: Try conversation.continue if available
      if (ai.hasConversation) {
        try {
          console.log('Using conversation.continue method');
          const response = await ai.sdk.cryptoWallet.conversation.continue(message, parseInt(user.user_id));
          
          updateConversationState(response, message);
          return response;
        } catch (error: any) {
          console.warn('conversation.continue failed, trying fallback:', error.message);
          // Continue to fallback
        }
      }
      
      // Method 2: Fallback to processAIIntent
      if (ai.hasAI) {
        try {
          console.log('Using processAIIntent for continue');
          const response = await ai.sdk.cryptoWallet.processAIIntent({
            user_input: message,
            user_id: parseInt(user.user_id),
            context: {}
          });
          
          updateConversationState(response, message);
          return response;
        } catch (error: any) {
          console.error('processAIIntent continue failed:', error.message);
          throw error;
        }
      }
      
      throw new Error('No AI conversation methods available');
    }, [user.user_id]),

    // FIXED: End conversation with proper method checking
    endConversation: useCallback(async () => {
      if (!user.user_id) return;
      
      const ai = getSafeAI();
      
      // Method 1: Try conversation.end if available
      if (ai.hasConversation) {
        try {
          await ai.sdk.cryptoWallet.conversation.end(parseInt(user.user_id));
          console.log('Conversation ended via conversation.end');
        } catch (error: any) {
          console.warn('conversation.end failed:', error.message);
          // Continue to fallback
        }
      }
      
      // Method 2: Try clearAISession as fallback
      if (ai.hasClearSession) {
        try {
          await ai.sdk.cryptoWallet.clearAISession(parseInt(user.user_id));
          console.log('Conversation ended via clearAISession');
        } catch (error: any) {
          console.warn('clearAISession failed:', error.message);
        }
      }
      
      // Always reset local state
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
      
      console.log('AI conversation ended');
    }, [user.user_id]),

    // FIXED: Quick AI operations with fallback
    quickChat: useCallback(async (message: string) => {
      if (!user.user_id) throw new Error('User not logged in');
      
      const ai = getSafeAI();
      
      // Try ai.chat first if available
      if (ai.sdk.cryptoWallet.ai?.chat) {
        try {
          return await ai.sdk.cryptoWallet.ai.chat(message, parseInt(user.user_id));
        } catch (error: any) {
          console.warn('ai.chat failed, trying processAIIntent:', error.message);
        }
      }
      
      // Fallback to processAIIntent
      if (ai.hasAI) {
        return await ai.sdk.cryptoWallet.processAIIntent({
          user_input: message,
          user_id: parseInt(user.user_id),
          context: {}
        });
      }
      
      throw new Error('No AI chat methods available');
    }, [user.user_id])
  };

  // FIXED: Helper function to update conversation state
  const updateConversationState = useCallback((response: any, userMessage: string) => {
    if (response?.agent_response) {
      const agentData = response.agent_response;
      
      setConversationState(prev => ({
        isActive: !agentData.completed && !agentData.cancelled,
        currentIntent: agentData.intent_type || prev.currentIntent,
        requiresInput: agentData.requires_input || false,
        requiresOnboarding: agentData.requires_onboarding || false,
        missingParameter: agentData.missing_parameter || null,
        availableOptions: agentData.available_options || null,
        conversationHistory: [
          ...prev.conversationHistory,
          { role: 'user', message: userMessage, timestamp: new Date() },
          { role: 'ai', message: agentData.message || agentData.ai_response, timestamp: new Date() }
        ]
      }));
      
      // Update session state
      if (agentData.completed || agentData.cancelled) {
        setAIState(prev => ({ ...prev, hasActiveSession: false }));
      } else {
        setAIState(prev => ({ ...prev, hasActiveSession: true }));
      }
    }
  }, []);

  // Debug SDK configuration
  const debugSDK = useCallback(() => {
    console.log('SDK Debug Information:');
    brdzSDK.utils.debugHeaders();
    console.log('Current State:', state);
    console.log('Current User:', user);
    console.log('AI State:', aiState);
    console.log('Conversation State:', conversationState);
    
    // Debug AI method availability
    const ai = getSafeAI();
    console.log('AI Methods Available:', {
      hasAI: ai.hasAI,
      hasConversation: ai.hasConversation,
      hasHealth: ai.hasHealth,
      hasClearSession: ai.hasClearSession
    });
  }, [state, user, aiState, conversationState]);

  // Test API connectivity
  const testConnection = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await brdzSDK.testnet.getChainList();
      
      setState(prev => ({ ...prev, isLoading: false }));
      
      if (response.success) {
        console.log('API connection test successful');
        return { success: true, message: 'API connection working' };
      } else {
        throw new Error('API test failed');
      }
      
    } catch (error: any) {
      console.error('API connection test failed:', error);
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
      console.error('Failed to get user profile:', error);
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
    
    // FIXED: AI shortcuts with method checking
    aiCreateWallet: (message: string) => {
      if (!user.user_id) return Promise.reject(new Error('Not logged in'));
      const ai = getSafeAI();
      if (ai.sdk.cryptoWallet.ai?.createWallet) {
        return ai.sdk.cryptoWallet.ai.createWallet(message, parseInt(user.user_id));
      }
      return Promise.reject(new Error('AI createWallet not available'));
    },
    aiListWallets: (message: string) => {
      if (!user.user_id) return Promise.reject(new Error('Not logged in'));
      const ai = getSafeAI();
      if (ai.sdk.cryptoWallet.ai?.listWallets) {
        return ai.sdk.cryptoWallet.ai.listWallets(message, parseInt(user.user_id));
      }
      return Promise.reject(new Error('AI listWallets not available'));
    },
    aiCheckBalance: (message: string) => {
      if (!user.user_id) return Promise.reject(new Error('Not logged in'));
      const ai = getSafeAI();
      if (ai.sdk.cryptoWallet.ai?.checkBalance) {
        return ai.sdk.cryptoWallet.ai.checkBalance(message, parseInt(user.user_id));
      }
      return Promise.reject(new Error('AI checkBalance not available'));
    },
    
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

    // FIXED: AI Agent helpers with method checking
    get aiReady() {
      return aiState.methodsAvailable && aiState.isHealthy && aiState.isConfigured;
    },

    get hasActiveConversation() {
      return conversationState.isActive;
    },

    get needsAIInput() {
      return conversationState.requiresInput || conversationState.requiresOnboarding;
    }
  };
};