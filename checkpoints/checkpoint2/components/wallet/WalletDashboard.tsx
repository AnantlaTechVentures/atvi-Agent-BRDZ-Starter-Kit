//Path: components/wallet/WalletDashboard.tsx

'use client';

import { useState, useEffect } from 'react';
import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useSDK } from '@/hooks/useSDK';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import BalanceCard from '@/components/wallet/BalanceCard';
import ChainCard from '@/components/wallet/ChainCard';
import ChatInterface from '@/components/chat/ChatInterface';
import ManualInterface from '@/components/manual/ManualInterface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Plus, Wallet, AlertCircle, MoreVertical, ChevronDown, TrendingUp, MessageCircle, BarChart3 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreateWalletModal } from '@/components/manual/CreateWalletModal';

interface ChainData {
  chain: string;
  address: string;
  balance: string;
  native_balance: string;
  usd_value?: number;
  native_usd_value?: number;
}

interface WalletData {
  id: number;
  bw_id: number; // Add bw_id for compatibility
  name: string;
  wallet_name: string; // Add wallet_name for compatibility
  user_id: number;
  created_at: string;
  chains: ChainData[];
  total_value_usd: number;
}

export default function WalletDashboard() {
  // Use authentication protection - will redirect to login if not authenticated
  const { isAuthenticated: authIsAuthenticated, isLoading: authIsLoading } = useRequireAuth();
  
  const { user } = useAuth();
  const { mode } = useMode();
  const { sdk, isReady, isAuthenticated, canMakeRequests, error, refreshToken } = useSDK();
  
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Smart caching for real-time balances
  const [balanceCache, setBalanceCache] = useState<Map<number, { data: any, timestamp: number }>>(new Map());
  const CACHE_DURATION = 30000; // 30 seconds cache
  
  // Real-time monitoring for incoming funds
  const [lastKnownBalances, setLastKnownBalances] = useState<Map<number, number>>(new Map());
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Check if cached data is still valid
  const isCacheValid = (walletId: number): boolean => {
    const cached = balanceCache.get(walletId);
    if (!cached) return false;
    return Date.now() - cached.timestamp < CACHE_DURATION;
  };

  // Detect balance changes and trigger instant updates
  const detectBalanceChanges = (walletId: number, newBalance: number): boolean => {
    const lastBalance = lastKnownBalances.get(walletId) || 0;
    const hasChanged = Math.abs(newBalance - lastBalance) > 0.01; // Detect changes > $0.01
    
    if (hasChanged) {
      console.log(`💰 Balance change detected for wallet ${walletId}: $${lastBalance.toFixed(2)} → $${newBalance.toFixed(2)}`);
      // Update last known balance
      setLastKnownBalances(prev => new Map(prev).set(walletId, newBalance));
    }
    
    return hasChanged;
  };

  // Start real-time monitoring for incoming funds
  const startRealTimeMonitoring = () => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    console.log('🔍 Starting real-time monitoring for incoming funds...');
    
    // Monitor every 30 seconds (reduced from 5s to avoid rate limiting)
    const monitoringInterval = setInterval(async () => {
      if (!sdk || !canMakeRequests || isRefreshing) return;
      
      try {
        // Only check one wallet per monitoring cycle to avoid rate limits
        const walletIndex = Math.floor(Date.now() / 30000) % wallets.length;
        const walletToCheck = wallets[walletIndex];
        if (!walletToCheck) return;
        
        console.log(`🔍 Monitoring wallet: ${walletToCheck.name} (cycle ${walletIndex})`);
        
        const balanceResponse = await sdk.cryptoWallet.balance.getTotal(walletToCheck.bw_id);
        
        if (balanceResponse?.success && balanceResponse?.data?.chains) {
          let totalValue = 0;
          
          // Calculate total value from all chains
          Object.values(balanceResponse.data.chains).forEach((chainBalance: any) => {
            if (chainBalance.native_balance && parseFloat(chainBalance.native_balance.balance || '0') > 0) {
              totalValue += chainBalance.native_balance.value_usd || 0;
            }
            
            if (chainBalance.tokens && Array.isArray(chainBalance.tokens)) {
              chainBalance.tokens.forEach((token: any) => {
                if (token.balance && parseFloat(token.balance) > 0) {
                  totalValue += token.value_usd || parseFloat(token.balance) || 0;
                }
              });
            }
          });
          
          // Check if balance changed (incoming funds detected)
          if (detectBalanceChanges(walletToCheck.bw_id, totalValue)) {
            console.log(`🚨 INCOMING FUNDS DETECTED for wallet ${walletToCheck.name}! Updating dashboard immediately...`);
            // Trigger immediate full refresh to update all UI elements
            refreshBalances();
          }
        }
              } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('429')) {
            console.warn('⚠️ Rate limit hit, backing off monitoring...');
            // Back off for 2 minutes if rate limited
            setTimeout(() => {
              console.log('🔄 Resuming monitoring after rate limit backoff...');
            }, 120000);
          } else {
            console.error('⚠️ Real-time monitoring error:', error);
          }
        }
    }, 30000); // Check every 30 seconds (reduced frequency)
    
    // Store interval ID for cleanup
    (window as any).monitoringInterval = monitoringInterval;
  };

  // Stop real-time monitoring
  const stopRealTimeMonitoring = () => {
    if ((window as any).monitoringInterval) {
      clearInterval((window as any).monitoringInterval);
      (window as any).monitoringInterval = null;
    }
    setIsMonitoring(false);
    console.log('🛑 Real-time monitoring stopped');
  };

  // Debug modal state changes
  useEffect(() => {
    console.log('Modal state changed to:', isCreateModalOpen);
  }, [isCreateModalOpen]);

  // Add session validation on page refresh/visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔍 Page became visible, validating session...');
        validateSession();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'user_data') {
        console.log('🔍 Auth data changed, validating session...');
        validateSession();
      }
    };

    // Listen for page visibility changes (refresh, tab switch, etc.)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for localStorage changes (from other tabs)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (isReady && isAuthenticated && user) {
      // Validate session before loading wallets
      validateSession();
    }
  }, [isReady, isAuthenticated, user]);

  // Auto-refresh balances when wallets are loaded - IMMEDIATE refresh for fast loading
  useEffect(() => {
    if (wallets.length > 0 && sdk && canMakeRequests && !isRefreshing) {
      console.log('🚀 Dashboard loaded - immediately fetching real-time balances for fast display...');
      // Immediate refresh for fast loading, no delay
      refreshBalances();
      
      // Start real-time monitoring for incoming funds
      startRealTimeMonitoring();
      
      // Set up background refresh every 30 seconds to keep data fresh
      const backgroundRefreshInterval = setInterval(() => {
        if (sdk && canMakeRequests && !isRefreshing) {
          console.log('🔄 Background refresh - keeping data fresh...');
          refreshBalances();
        }
      }, 30000); // 30 seconds
      
      return () => {
        clearInterval(backgroundRefreshInterval);
        stopRealTimeMonitoring();
      };
    }
  }, [wallets.length, sdk, canMakeRequests]);

  const validateSession = async () => {
    try {
      // Check if token exists and is valid
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.log('🔐 No auth token found, redirecting to login');
        window.location.href = '/auth/login';
        return;
      }

      // Check if user data exists
      const userData = localStorage.getItem('user_data');
      if (!userData) {
        console.log('🔐 No user data found, redirecting to login');
        window.location.href = '/auth/login';
        return;
      }

      // Check if token is expired (basic check - you can add JWT expiration validation)
      const tokenAge = Date.now() - (localStorage.getItem('token_timestamp') ? parseInt(localStorage.getItem('token_timestamp')!) : 0);
      const maxTokenAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (tokenAge > maxTokenAge) {
        console.log('🔐 Token expired, redirecting to login');
        localStorage.clear(); // Clear all data
        window.location.href = '/auth/login';
        return;
      }

      console.log('✅ Session validated, refreshing SDK token...');
      
      // Refresh SDK token to ensure API calls work
      if (refreshToken()) {
        console.log('✅ SDK token refreshed, loading wallets');
        loadWallets();
      } else {
        console.log('❌ Failed to refresh SDK token, redirecting to login');
        localStorage.clear();
        window.location.href = '/auth/login';
      }
    } catch (error) {
      console.error('❌ Session validation failed:', error);
      localStorage.clear();
      window.location.href = '/auth/login';
    }
  };

  const loadWallets = async () => {
    if (!canMakeRequests || !user?.user_id) {
      setLoadError('SDK not ready or user not authenticated');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setLoadError(null);
      
      console.log('🔍 Loading wallets for user:', user.user_id);
      
      // Convert user_id to number if it's a string
      const userId = typeof user.user_id === 'string' ? parseInt(user.user_id) : user.user_id;
      
      // Menggunakan BRDZ SDK cryptoWallet module
      const response = await sdk.cryptoWallet.getUserWallets(userId);
      
      console.log('📥 Raw wallet response:', response);
      console.log('📊 Response.data type:', typeof response.data);
      console.log('📊 Is response.data array?:', Array.isArray(response.data));
      console.log('📊 Response.data content:', response.data);
      
      if (response.success && response.data) {
        // Handle different response structures
        let walletsArray = [];
        
        if (Array.isArray(response.data)) {
          walletsArray = response.data;
        } else if (response.data.wallets && Array.isArray(response.data.wallets)) {
          walletsArray = response.data.wallets;
        } else if (response.data.crypto_wallets && Array.isArray(response.data.crypto_wallets)) {
          walletsArray = response.data.crypto_wallets;
        } else if (typeof response.data === 'object' && response.data !== null) {
          // Single wallet object, wrap in array
          walletsArray = [response.data];
        } else {
          console.warn('⚠️ Unexpected response.data structure, treating as empty array');
          walletsArray = [];
        }
        
        console.log('📋 Processed wallets array:', walletsArray);
        
        if (walletsArray.length === 0) {
          console.log('ℹ️ No crypto wallets found for user');
          setWallets([]);
          return;
        }
        
        // The API is returning proper wallet objects, not tokens
        console.log('✅ Detected proper wallet structure from API');
        
        // Create a persistent cache for wallet data to improve performance
        const walletCache = new Map();
        
        // Load cached data from localStorage (non-sensitive data only)
        try {
          const cachedWallets = localStorage.getItem(`wallet_cache_${user.user_id}`);
          if (cachedWallets) {
            const parsed = JSON.parse(cachedWallets);
            const now = Date.now();
            // Cache expires after 5 minutes
            if (now - parsed.timestamp < 5 * 60 * 1000) {
              console.log('📦 Loading cached wallet data from localStorage');
              parsed.wallets.forEach((cachedWallet: any) => {
                walletCache.set(`wallet_${cachedWallet.bw_id}`, cachedWallet);
              });
            }
          }
        } catch (error) {
          console.log('⚠️ Failed to load cached wallet data:', error);
        }
        
        // Process each wallet to get its balance and chain information
        const walletsWithBalances = await Promise.all(
          walletsArray.map(async (wallet: any) => {
            console.log('🔍 Processing wallet:', wallet.wallet_name, 'ID:', wallet.bw_id);
            
            // Check cache first
            const cacheKey = `wallet_${wallet.bw_id}`;
            const cachedData = walletCache.get(cacheKey);
            
            if (cachedData) {
              console.log(`📦 Using cached data for wallet ${wallet.bw_id}`);
              return cachedData;
            }
            
            try {
              // Get balance for this wallet with appropriate timeout
              console.log(`🔄 Fetching balance for wallet ${wallet.bw_id}...`);
              const balancePromise = sdk.cryptoWallet.balance.getTotal(wallet.bw_id);
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Balance API timeout')), 15000) // Increased to 15s
              );
              
              const balanceResponse = await Promise.race([balancePromise, timeoutPromise]);
              
              console.log(`📥 Balance response for wallet ${wallet.bw_id}:`, balanceResponse);
              
              const chains: ChainData[] = [];
              let totalValueUsd = 0;
              
              if (balanceResponse.success || balanceResponse.data) {
                const responseData = balanceResponse.data || balanceResponse;
                console.log(`✅ Processing balance data for wallet ${wallet.bw_id}:`, JSON.stringify(responseData, null, 2));
                
                // Handle multiple possible response formats
                let chainsData = null;
                
                // Format 1: Direct chains object
                if (responseData.chains) {
                  chainsData = responseData.chains;
                }
                // Format 2: Nested in data.chains
                else if (responseData.data?.chains) {
                  chainsData = responseData.data.chains;
                }
                // Format 3: Direct response is chains object
                else if (typeof responseData === 'object' && responseData !== null) {
                  chainsData = responseData;
                }
                
                if (chainsData) {
                  console.log(`🔗 Processing chains data:`, JSON.stringify(chainsData, null, 2));
                  
                  // Handle chains as object or array
                  const chainsToProcess = Array.isArray(chainsData) ? chainsData : Object.entries(chainsData);
                  
                  chainsToProcess.forEach(([chainId, chainData]: [string, any], index: number) => {
                    console.log(`🔗 Processing chain ${chainId}:`, JSON.stringify(chainData, null, 2));
                    
                    // Extract balance values with multiple fallback methods
                    const usdcBalance = parseFloat(chainData.usdc_balance || '0');
                    const nativeBalance = parseFloat(chainData.native_balance || '0');
                    const usdcValueUsd = chainData.usdc_value_usd || (usdcBalance > 0 ? usdcBalance : 0); // USDC ≈ $1
                    const nativeValueUsd = chainData.native_value_usd || chainData.native_usd_value || 0;
                    
                    const chain: ChainData = {
                      chain: chainId,
                      address: chainData.address || 'N/A',
                      balance: usdcBalance.toString(),
                      native_balance: nativeBalance.toString(),
                      usd_value: usdcValueUsd,
                      native_usd_value: nativeValueUsd
                    };
                    
                    chains.push(chain);
                    totalValueUsd += usdcValueUsd + nativeValueUsd;
                    
                    console.log(`💰 Chain ${chainId}: USDC=$${usdcValueUsd}, Native=$${nativeValueUsd}`);
                  });
                }
                
                console.log(`✅ Created ${chains.length} chains for wallet ${wallet.bw_id}, total value: $${totalValueUsd}`);
              } else {
                // If balance API response structure is unexpected, log and create default structure
                console.log(`⚠️ Balance API response structure unexpected for wallet ${wallet.bw_id}:`, balanceResponse);
                console.log(`⚠️ Response success: ${balanceResponse.success}, has data: ${!!balanceResponse.data}`);
                
                // Create default chains based on common blockchain types
                const defaultChains = [
                  { name: 'EVM', icon: '🔷' },
                  { name: 'Bitcoin Testnet', icon: '🟠' },
                  { name: 'Solana Devnet', icon: '🟣' },
                  { name: 'TRON Shasta Testnet', icon: '🔵' }
                ];
                
                defaultChains.forEach((chainInfo, index) => {
                  const chain: ChainData = {
                    chain: chainInfo.name,
                    address: `Generated_${wallet.bw_id}_${index}`,
                    balance: '0.000000',
                    native_balance: '0.000000',
                    usd_value: 0,
                    native_usd_value: 0
                  };
                  chains.push(chain);
                });
              }
              
              const walletData = {
                id: wallet.bw_id,
                bw_id: wallet.bw_id,
                name: wallet.wallet_name || 'Unnamed Wallet',
                wallet_name: wallet.wallet_name || 'Unnamed Wallet',
                user_id: wallet.user_id,
                created_at: wallet.created_at || new Date().toISOString(),
                chains,
                total_value_usd: totalValueUsd
              };
              
              // Cache the wallet data for future use
              walletCache.set(cacheKey, walletData);
              
              return walletData;
            } catch (error) {
              console.error(`Failed to load balance for wallet ${wallet.bw_id}:`, error);
              
              // Create a fallback wallet with default structure
              const fallbackChains = [
                { name: 'EVM', icon: '🔷' },
                { name: 'Bitcoin Testnet', icon: '🟠' },
                { name: 'Solana Devnet', icon: '🟣' },
                { name: 'TRON Shasta Testnet', icon: '🔵' }
              ];
              
              const chains: ChainData[] = fallbackChains.map((chainInfo, index) => ({
                chain: chainInfo.name,
                address: `Fallback_${wallet.bw_id}_${index}`,
                balance: '0.000000',
                native_balance: '0.000000',
                usd_value: 0,
                native_usd_value: 0
              }));
              
              const fallbackWallet = {
                id: wallet.bw_id,
                bw_id: wallet.bw_id,
                name: wallet.wallet_name || 'Unnamed Wallet',
                wallet_name: wallet.wallet_name || 'Unnamed Wallet',
                user_id: wallet.user_id,
                created_at: wallet.created_at || new Date().toISOString(),
                chains,
                total_value_usd: 0
              };
              
              // Cache the fallback data
              walletCache.set(cacheKey, fallbackWallet);
              
              return fallbackWallet;
            }
          })
        );
        
        console.log('✅ Wallets with balances loaded:', walletsWithBalances);
        
        // Save non-sensitive wallet data to localStorage cache
        try {
          const cacheData = {
            timestamp: Date.now(),
            wallets: walletsWithBalances.map(wallet => ({
              id: wallet.id,
              bw_id: wallet.bw_id,
              name: wallet.name,
              wallet_name: wallet.wallet_name,
              user_id: wallet.user_id,
              created_at: wallet.created_at,
              chains: wallet.chains.map((chain: ChainData) => ({
                chain: chain.chain,
                address: chain.address,
                balance: chain.balance,
                native_balance: chain.native_balance,
                usd_value: chain.usd_value,
                native_usd_value: chain.native_usd_value
              })),
              total_value_usd: wallet.total_value_usd
            }))
          };
          
          localStorage.setItem(`wallet_cache_${user.user_id}`, JSON.stringify(cacheData));
          console.log('💾 Wallet data cached to localStorage for faster loading');
        } catch (error) {
          console.log('⚠️ Failed to cache wallet data:', error);
        }
        
        setWallets(walletsWithBalances);
      } else {
        throw new Error(response.message || 'Failed to load wallets');
      }
    } catch (error: any) {
      console.error('❌ Failed to load wallets:', error);
      setLoadError(error.message || 'Failed to load wallets');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBalances = async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 Refreshing all wallet balances with real-time data...');
      
      // Fetch real-time balances for all wallets using the same logic as wallets page
      const updatedWallets = [];
      
      // Add delay between requests to avoid rate limiting
      for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        
        // Add 500ms delay between wallet requests to avoid rate limiting
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
          try {
            console.log(`🔍 Calculating balance for wallet: ${wallet.name} (bw_id: ${wallet.bw_id})`);

            // Check cache first for fast loading
            if (isCacheValid(wallet.bw_id)) {
              const cached = balanceCache.get(wallet.bw_id);
              console.log(`⚡ Using cached data for wallet ${wallet.name} (${Math.round((Date.now() - cached!.timestamp) / 1000)}s old)`);
              
              // Process cached data
              if (cached?.data?.chains) {
                let totalValue = 0;
                const updatedChains: ChainData[] = [];
                
                Object.entries(cached.data.chains).forEach(([chainId, chainData]: [string, any]) => {
                  // Process cached chain data (same logic as below)
                  let chainAddress = 'N/A';
                  if (chainData.address) {
                    chainAddress = chainData.address;
                  } else if (chainData.wallet_address) {
                    chainAddress = chainData.wallet_address;
                  } else if (chainData.wallet) {
                    chainAddress = chainData.wallet;
                  } else if (chainData.account) {
                    chainAddress = chainData.account;
                  }
                  
                  // Fallback to original wallet data
                  if (chainAddress === 'N/A') {
                    const originalChain = wallet.chains?.find(c => c.chain === chainId);
                    if (originalChain?.address && originalChain.address !== 'N/A') {
                      chainAddress = originalChain.address;
                    }
                  }
                  
                  // Calculate values from cached data
                  let usdcBalance = '0';
                  let usdcValue = 0;
                  if (chainData.tokens && Array.isArray(chainData.tokens)) {
                    const usdcToken = chainData.tokens.find((t: any) => t.symbol === 'USDC');
                    if (usdcToken) {
                      usdcBalance = usdcToken.balance || '0';
                      usdcValue = usdcToken.value_usd || parseFloat(usdcToken.balance) || 0;
                    }
                  }
                  
                  let nativeBalance = '0';
                  let nativeValue = 0;
                  if (chainData.native_balance) {
                    nativeBalance = chainData.native_balance.balance || '0';
                    nativeValue = chainData.native_balance.value_usd || 0;
                  }
                  
                  totalValue += usdcValue + nativeValue;
                  
                  updatedChains.push({
                    chain: chainId,
                    address: chainAddress,
                    balance: usdcBalance,
                    native_balance: nativeBalance,
                    usd_value: usdcValue,
                    native_usd_value: nativeValue
                  });
                });
                
                updatedWallets.push({
                  ...wallet,
                  total_value_usd: totalValue,
                  chains: updatedChains
                });
                
                continue; // Skip API call, use cached data
              }
            }

            // Use the same API call as wallets page
            const balanceResponse = await sdk.cryptoWallet.balance.getTotal(wallet.bw_id);
          
          if (balanceResponse?.success && balanceResponse?.data?.chains) {
            let totalValue = 0;
            
            // Calculate total value from all chains (same logic as wallets page)
            Object.values(balanceResponse.data.chains).forEach((chainBalance: any) => {
              // Add native token value
              if (chainBalance.native_balance && parseFloat(chainBalance.native_balance.balance || '0') > 0) {
                const nativeValue = chainBalance.native_balance.value_usd || 0;
                totalValue += nativeValue;
              }
              
              // Add token values (USDC, etc.)
              if (chainBalance.tokens && Array.isArray(chainBalance.tokens)) {
                chainBalance.tokens.forEach((token: any) => {
                  if (token.balance && parseFloat(token.balance) > 0) {
                    let tokenValue = 0;
                    if (token.symbol === 'USDC') {
                      tokenValue = token.value_usd || parseFloat(token.balance);
                    } else {
                      tokenValue = token.value_usd || 0;
                    }
                    totalValue += tokenValue;
                  }
                });
              }
            });
            
            console.log(`💰 Wallet ${wallet.name}: $${totalValue.toFixed(2)}`);
            
            // Update wallet with real-time balance AND all related fields
            const updatedWallet = {
              ...wallet,
              total_value_usd: totalValue
            };
            
            // Check for balance changes and trigger instant updates
            detectBalanceChanges(wallet.bw_id, totalValue);
            
            // Also update the chains array with real-time data to fix the "N/A...N/A" issue
            if (balanceResponse?.success && balanceResponse?.data?.chains) {
              const updatedChains: ChainData[] = [];
              
              Object.entries(balanceResponse.data.chains).forEach(([chainId, chainData]: [string, any]) => {
                // Get the actual address from the balance response - check multiple possible locations
                let chainAddress = 'N/A';
                if (chainData.address) {
                  chainAddress = chainData.address;
                } else if (chainData.wallet_address) {
                  chainAddress = chainData.wallet_address;
                } else if (chainData.wallet) {
                  chainAddress = chainData.wallet;
                } else if (chainData.account) {
                  chainAddress = chainData.account;
                }
                
                // If still N/A, try to get from the original wallet's chains data
                if (chainAddress === 'N/A') {
                  const originalChain = wallet.chains?.find(c => c.chain === chainId);
                  if (originalChain?.address && originalChain.address !== 'N/A') {
                    chainAddress = originalChain.address;
                  }
                }
                
                console.log(`🔍 Chain ${chainId} address: ${chainAddress} (from: ${JSON.stringify(chainData).substring(0, 100)}...)`);
                
                // Calculate USDC balance and value
                let usdcBalance = '0';
                let usdcValue = 0;
                if (chainData.tokens && Array.isArray(chainData.tokens)) {
                  const usdcToken = chainData.tokens.find((t: any) => t.symbol === 'USDC');
                  if (usdcToken) {
                    usdcBalance = usdcToken.balance || '0';
                    usdcValue = usdcToken.value_usd || parseFloat(usdcToken.balance) || 0;
                  }
                }
                
                // Calculate native token balance and value
                let nativeBalance = '0';
                let nativeValue = 0;
                if (chainData.native_balance) {
                  nativeBalance = chainData.native_balance.balance || '0';
                  nativeValue = chainData.native_balance.value_usd || 0;
                }
                
                updatedChains.push({
                  chain: chainId,
                  address: chainAddress,
                  balance: usdcBalance,
                  native_balance: nativeBalance,
                  usd_value: usdcValue,
                  native_usd_value: nativeValue
                });
              });
              
                          updatedWallet.chains = updatedChains;
            console.log(`🔗 Updated ${updatedChains.length} chains for wallet ${wallet.name} with real-time data`);
            
            // Cache the fresh data for future fast loading
            setBalanceCache(prev => new Map(prev).set(wallet.bw_id, {
              data: balanceResponse.data,
              timestamp: Date.now()
            }));
            console.log(`💾 Cached fresh data for wallet ${wallet.name}`);
          }
          
          updatedWallets.push(updatedWallet);
          } else {
            updatedWallets.push(wallet);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          if (errorMessage.includes('429')) {
            console.warn(`⚠️ Rate limit hit for wallet ${wallet.name}, skipping...`);
            // Skip this wallet and continue with others
            updatedWallets.push(wallet);
          } else {
            console.error(`⚠️ Failed to refresh wallet ${wallet.name}:`, error);
            updatedWallets.push(wallet);
          }
        }
      }
      
      // Update state with real-time balances
      setWallets(updatedWallets);
      console.log('✅ All wallet balances refreshed with real-time data');
      
    } catch (error) {
      console.error('❌ Failed to refresh balances:', error);
      // Fallback to loading from backend
      await loadWallets();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefreshWallet = async (walletId: number) => {
    try {
      console.log(`🔄 Manually refreshing wallet ${walletId}...`);
      
      const wallet = wallets.find(w => w.id === walletId);
      if (!wallet) {
        console.error(`Wallet ${walletId} not found`);
        return;
      }
      
      // Force refresh this specific wallet
      const balanceResponse = await sdk.cryptoWallet.balance.getTotal(walletId);
      console.log(`📥 Manual refresh response for wallet ${walletId}:`, balanceResponse);
      
      if (balanceResponse.success && balanceResponse.data) {
        // Update the wallet with fresh data
        const updatedChains: ChainData[] = [];
        let totalValueUsd = 0;
        
        for (const [chainId, chainData] of Object.entries(balanceResponse.data)) {
          const chain: ChainData = {
            chain: chainId,
            address: (chainData as any).address || 'N/A',
            balance: (chainData as any).usdc_balance || '0',
            native_balance: (chainData as any).native_balance || '0',
            usd_value: (chainData as any).usdc_value_usd || 0,
            native_usd_value: (chainData as any).native_value_usd || 0
          };
          
          updatedChains.push(chain);
          totalValueUsd += (chain.usd_value || 0) + (chain.native_usd_value || 0);
        }
        
        setWallets(prevWallets => 
          prevWallets.map(w => 
            w.id === walletId 
              ? { ...w, chains: updatedChains, total_value_usd: totalValueUsd }
              : w
          )
        );
        
        console.log(`✅ Wallet ${walletId} refreshed successfully with ${updatedChains.length} chains`);
      }
    } catch (error) {
      console.error(`Failed to manually refresh wallet ${walletId}:`, error);
    }
  };

  const handleRefreshChain = async (walletId: number, chainId: string) => {
    try {
      console.log(`🔄 Refreshing balance for wallet ${walletId}, chain ${chainId}`);
      
      const balanceResponse = await sdk.cryptoWallet.balance.getChain(walletId, chainId);
      
      if (balanceResponse.success) {
        // Update specific chain balance in state
        setWallets(prevWallets => 
          prevWallets.map(wallet => {
            if (wallet.id === walletId) {
              const updatedChains = wallet.chains.map(chain => {
                if (chain.chain === chainId) {
                  return {
                    ...chain,
                    balance: balanceResponse.data.usdc_balance || '0',
                    native_balance: balanceResponse.data.native_balance || '0',
                    usd_value: balanceResponse.data.usdc_value_usd || 0,
                    native_usd_value: balanceResponse.data.native_value_usd || 0
                  };
                }
                return chain;
              });
              
              // Recalculate total value
              const totalValueUsd = updatedChains.reduce((sum, chain) => 
                sum + (chain.usd_value || 0) + (chain.native_usd_value || 0), 0
              );
              
              return {
                ...wallet,
                chains: updatedChains,
                total_value_usd: totalValueUsd
              };
            }
            return wallet;
          })
        );
      }
    } catch (error) {
      console.error('Failed to refresh chain balance:', error);
    }
  };

  const handleCreateWallet = async () => {
    // Open the create wallet modal
    console.log('Create new wallet - opening modal');
    setIsCreateModalOpen(true);
    console.log('Modal state set to:', true);
  };

  // Show SDK loading state
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Initializing SDK...</p>
        </div>
      </div>
    );
  }

  // Show SDK error
  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            SDK Error: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show authentication required
  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please log in to access your wallet dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Loading your wallets...</p>
          <p className="text-xs text-muted-foreground">Loading wallet balances and chain information...</p>
        </div>
      </div>
    );
  }

  // Show load error
  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {loadError}
          </AlertDescription>
        </Alert>
        <Button 
          onClick={loadWallets} 
          variant="outline" 
          className="mt-4"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const totalPortfolioValue = wallets.reduce((sum, wallet) => sum + wallet.total_value_usd, 0);
  const totalWallets = wallets.length;
  
  // Calculate total unique blockchains across all wallets
  const calculateTotalChains = () => {
    const uniqueChains = new Set<string>();
    
    wallets.forEach(wallet => {
      if (wallet.chains && Array.isArray(wallet.chains)) {
        wallet.chains.forEach(chain => {
          // Only count chains that have balances (are actually active)
          if ((chain.balance && parseFloat(chain.balance) > 0) || 
              (chain.native_balance && parseFloat(chain.native_balance) > 0)) {
            uniqueChains.add(chain.chain);
          }
        });
      }
    });
    
    return uniqueChains.size;
  };
  
  const totalChains = calculateTotalChains();
  
  // Calculate total unique tokens across all wallets (same logic as wallets page)
  const calculateTotalTokens = () => {
    let totalTokens = 0;
    const uniqueTokens = new Set<string>();
    
    wallets.forEach(wallet => {
      if (wallet.chains && Array.isArray(wallet.chains)) {
        wallet.chains.forEach(chain => {
          // Count USDC tokens
          if (chain.balance && parseFloat(chain.balance) > 0) {
            uniqueTokens.add(`${wallet.id}-${chain.chain}-USDC`);
            totalTokens++;
          }
          
          // Count native tokens
          if (chain.native_balance && parseFloat(chain.native_balance) > 0) {
            uniqueTokens.add(`${wallet.id}-${chain.chain}-NATIVE`);
            totalTokens++;
          }
        });
      }
    });
    
    return totalTokens;
  };
  
  const totalTokens = calculateTotalTokens();
  
  // Debug summary calculations
  console.log(`📊 Dashboard Summary: Portfolio=$${totalPortfolioValue.toFixed(2)}, Wallets=${totalWallets}, Chains=${totalChains}, Tokens=${totalTokens}`);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Wallet Vault</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">Manage your multi-chain cryptocurrency portfolio</p>
        </div>
        
        {/* Header Action Buttons */}
                  <div className="flex items-center gap-3">
            {/* Real-time monitoring status indicator */}
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-xs text-green-700 dark:text-green-300 font-medium">
                {isMonitoring ? 'Live Monitoring' : 'Monitoring Off'}
              </span>
            </div>
            
            <Button 
              onClick={() => {
                // Clear cache for fresh data on manual refresh
                setBalanceCache(new Map());
                console.log('🧹 Cache cleared for manual refresh');
                refreshBalances();
              }}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="border-gray-300 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-800"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          
          <Button 
            onClick={handleCreateWallet}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white border-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Wallet
          </Button>
        </div>
      </div>

      {/* Summary Cards - Moved to top for better visibility */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-700 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-1">${totalPortfolioValue.toFixed(2)}</div>
          <div className="text-sm text-blue-700 dark:text-blue-300 mb-2">Total Portfolio</div>
          <div className="text-xs text-green-600 dark:text-green-400 font-medium">+5.2% 24h</div>
        </div>
        
        <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-700 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-green-900 dark:text-green-100 mb-1">{totalWallets}</div>
          <div className="text-sm text-green-700 dark:text-green-300">Wallets</div>
        </div>
        
        <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-700 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-purple-900 dark:text-purple-100 mb-1">{totalChains}</div>
          <div className="text-sm text-purple-700 dark:text-purple-300">Blockchains</div>
        </div>
        
        <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl border border-orange-200 dark:border-orange-700 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-orange-900 dark:text-orange-100 mb-1">
            {totalTokens}
          </div>
          <div className="text-sm text-orange-700 dark:text-orange-300">Tokens</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8" aria-label="Dashboard tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Overview</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('wallets')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'wallets'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Wallet className="h-4 w-4" />
              <span>Wallets</span>
              <Badge variant="secondary" className="ml-1 text-xs">{totalWallets}</Badge>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'chat'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <span>AI Chat</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Action Buttons Section */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleCreateWallet}
              className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-6 py-3 text-base font-medium shadow-sm hover:shadow-md transition-shadow"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create New Wallet
            </Button>
            
            <Button 
              onClick={refreshBalances}
              disabled={isRefreshing}
              className="bg-green-600 hover:bg-green-700 text-white border-0 px-6 py-3 text-base font-medium shadow-sm hover:shadow-md transition-shadow"
            >
              <RefreshCw className={`h-5 w-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Balances
            </Button>
            
            <Button 
              onClick={() => setActiveTab('chat')}
              className="bg-purple-600 hover:bg-purple-700 text-white border-0 px-6 py-3 text-base font-medium shadow-sm hover:shadow-md transition-shadow"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Ask AI Assistant
            </Button>
          </div>

          {/* Portfolio Analytics Section */}
          <div className="flex justify-center">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center max-w-md bg-gray-50 dark:bg-gray-800/50">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Portfolio Analytics</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">View detailed analytics and performance metrics</p>
              
              <Button 
                onClick={() => setActiveTab('analytics')}
                variant="outline"
                className="border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-2"
              >
                View Analytics
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Wallets Tab */}
      {activeTab === 'wallets' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Wallet Management</h3>
            <Button 
              onClick={handleCreateWallet}
              className="gradient-primary text-white border-0 shadow-sm hover:shadow-md transition-shadow"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Wallet
            </Button>
          </div>
          
          <ManualInterface wallets={wallets} onWalletsUpdate={loadWallets} />
        </div>
      )}

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">AI Chat Assistant</h3>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">Powered by BRDZ AI</Badge>
          </div>
          
          <ChatInterface />
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Portfolio Analytics</h3>
            <Button variant="outline" size="sm" className="border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500">
              <TrendingUp className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/20 rounded-xl border border-blue-200 dark:border-blue-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Portfolio Growth</h4>
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">+12.5%</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Last 30 days</p>
            </div>
            
            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20 rounded-xl border border-green-200 dark:border-green-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Active Wallets</h4>
                <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{totalWallets}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Total wallets</p>
            </div>
            
            <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-800/20 rounded-xl border border-purple-200 dark:border-purple-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Blockchain Coverage</h4>
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{totalChains}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Supported chains</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Create Wallet Modal */}
      <CreateWalletModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onWalletCreated={() => {
          console.log('New wallet created');
          setIsCreateModalOpen(false);
          // Refresh wallets list
          loadWallets();
        }}
      />
    </div>
  );
}