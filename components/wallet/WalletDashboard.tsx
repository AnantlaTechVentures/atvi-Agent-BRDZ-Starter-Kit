//Path: components/wallet/WalletDashboard_fixed.tsx

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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Plus, Wallet, AlertCircle, MoreVertical, ChevronDown, TrendingUp, MessageCircle, BarChart3, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreateWalletModal } from '@/components/manual/CreateWalletModal';

interface ChainData {
  chain: string;
  address: string;
  balance: string;
  native_balance: string;
  usd_value: number;
  native_usd_value: number;
}

interface WalletData {
  id: number;
  bw_id: number;
  name: string;
  wallet_name: string;
  user_id: number;
  created_at: string;
  chains: ChainData[];
  total_value_usd: number;
}

export default function WalletDashboard() {
  // Use authentication protection - will redirect to login if not authenticated
  const { isAuthenticated: authIsAuthenticated, isLoading: authIsLoading } = useRequireAuth();
  const { user } = useAuth();
  const { mode, setMode } = useMode();
  const { sdk, isReady, isAuthenticated, canMakeRequests, error } = useSDK();
  
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'wallets' | 'analytics'>('overview');
  
  // Cache for wallet data
  const [walletCache, setWalletCache] = useState<Map<string, WalletData>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Robust balance calculation function (same logic as Wallet page)
  const calculateWalletTotalValue = async (wallet: any): Promise<number> => {
    if (!sdk || !isReady) {
      console.log('❌ SDK not ready for balance calculation');
      return 0;
    }

    try {
      console.log(`🔍 Calculating balance for wallet: ${wallet.wallet_name} (bw_id: ${wallet.bw_id})`);
      
      let totalValue = 0;
      
      // Try getTotal API (same as Wallet page)
      try {
        console.log(`📡 Trying getTotal API for wallet ${wallet.bw_id}...`);
        const balanceResponse = await sdk.cryptoWallet.balance.getTotal(wallet.bw_id);
        console.log(`📊 Balance API response:`, balanceResponse);
        
        if (balanceResponse?.success && balanceResponse?.data?.chains) {
          console.log(`🔗 Found chains in balance response:`, balanceResponse.data.chains);
          
          // Loop through each chain in balance response
          Object.values(balanceResponse.data.chains).forEach((chainBalance: any) => {
            console.log(`💰 Processing chain balance:`, chainBalance);
            
            // Add native token value
            if (chainBalance.native_balance && parseFloat(chainBalance.native_balance.balance || '0') > 0) {
              const nativeValue = chainBalance.native_balance.value_usd || 0;
              console.log(`💎 Native balance: ${nativeValue}`);
              totalValue += nativeValue;
            }
            
            // Add token values (USDC, etc.)
            if (chainBalance.tokens && Array.isArray(chainBalance.tokens)) {
              console.log(`🪙 Found ${chainBalance.tokens.length} tokens`);
              
              chainBalance.tokens.forEach((token: any) => {
                if (token.balance && parseFloat(token.balance) > 0) {
                  let tokenValue = 0;
                  
                  // For USDC, use balance as USD value if no value_usd
                  if (token.symbol === 'USDC') {
                    tokenValue = token.value_usd || parseFloat(token.balance);
                    console.log(`💵 USDC token: ${token.balance} = ${tokenValue}`);
                  } else {
                    tokenValue = token.value_usd || 0;
                    console.log(`🔸 ${token.symbol} token: ${tokenValue}`);
                  }
                  
                  totalValue += tokenValue;
                }
              });
            }
          });
          
          console.log(`💰 Final calculated value for ${wallet.wallet_name}: ${totalValue}`);
          return totalValue;
        } else {
          console.log(`⚠️ Balance API response invalid:`, balanceResponse);
        }
      } catch (balanceError) {
        console.error(`⚠️ Balance API failed:`, balanceError);
      }
      
      // Fallback: Use backend value if available
      if (totalValue === 0 && wallet.total_value_usd) {
        console.log(`🔄 Using backend value: ${wallet.total_value_usd}`);
        totalValue = wallet.total_value_usd;
      }
      
      console.log(`💰 Final total value for ${wallet.wallet_name}: ${totalValue}`);
      return totalValue;
      
    } catch (error) {
      console.error(`❌ Error calculating balance for ${wallet.wallet_name}:`, error);
      return wallet.total_value_usd || 0;
    }
  };

  const loadWallets = async () => {
    if (!sdk || !isReady) {
      setLoadError('SDK is still initializing, please wait...');
      setIsLoading(false);
      return;
    }
    
    if (!user?.user_id) {
      setLoadError('User not authenticated, please log in again');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setLoadError(null);
      
      const userId = typeof user.user_id === 'string' ? parseInt(user.user_id) : user.user_id;
      console.log('🚀 Loading wallets for user:', userId);
      
      const response = await sdk.cryptoWallet.getUserWallets(userId);
      console.log('📦 Raw wallet API response:', response);
      
      if (response?.success && response?.data?.wallets) {
        console.log(`🔢 Found ${response.data.wallets.length} wallets, calculating balances...`);
        
        // Load wallets with balance calculation (same as Wallet page)
        const walletsList = await Promise.all(
          response.data.wallets.map(async (wallet: any, index: number) => {
            console.log(`\n📝 Processing wallet ${index + 1}/${response.data.wallets.length}: ${wallet.wallet_name}`);
            
            // Create wallet object first
            const walletObj = {
              id: wallet.bw_id,
              bw_id: wallet.bw_id,
              wallet_name: wallet.wallet_name || 'Unnamed Wallet',
              total_chains: wallet.total_chains || 0,
              active_chains: wallet.active_chains || 0,
              total_tokens: wallet.total_tokens || 0,
              total_value_usd: wallet.total_value_usd || 0,
              chain_names: wallet.chain_names || [],
              chains: wallet.chains || [],
              status: wallet.status || 'active',
              created_at: wallet.created_at || new Date().toISOString()
            };
            
            // Calculate actual total USD value from balance data (same as Wallet page)
            console.log(`💰 Calculating balance for wallet: ${walletObj.wallet_name}`);
            const calculatedValue = await calculateWalletTotalValue(walletObj);
            
            const finalWallet: WalletData = {
              id: walletObj.bw_id,
              bw_id: walletObj.bw_id,
              name: walletObj.wallet_name,
              wallet_name: walletObj.wallet_name,
              user_id: userId,
              created_at: walletObj.created_at,
              chains: [
                {
                  chain: 'Total Balance',
                  address: `Wallet_${walletObj.bw_id}`,
                  balance: calculatedValue.toString(),
                  native_balance: '0.000000',
                  usd_value: calculatedValue,
                  native_usd_value: 0
                }
              ],
              total_value_usd: calculatedValue // Use calculated value instead of backend value
            };
            
            console.log(`✅ Final wallet data:`, {
              name: finalWallet.wallet_name,
              bw_id: finalWallet.bw_id,
              calculated_value: calculatedValue,
              chains: finalWallet.chains?.length || 0,
              tokens: finalWallet.total_value_usd
            });
            
            return finalWallet;
          })
        );
        
        console.log('🎉 All wallets processed with calculated values:', 
          walletsList.map(w => ({ name: w.wallet_name, value: w.total_value_usd }))
        );
        setWallets(walletsList);
      } else {
        console.log('⚠️ No wallets found in API response');
        setWallets([]);
      }
    } catch (error) {
      console.error('❌ Failed to load wallets:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load wallets');
      setWallets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBalances = async () => {
    if (!sdk || !canMakeRequests || isRefreshing) return;
    
    setIsRefreshing(true);
    setLastRefreshTime(Date.now());
    
    try {
      console.log('🔄 Refreshing balances...');
      await loadWallets();
      console.log('✅ Balance refresh completed');
    } catch (error) {
      console.error('❌ Error during balance refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isReady && user) {
      console.log('🚀 SDK ready and user available, loading wallets...');
      loadWallets();
    }
  }, [isReady, user]);

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
  const totalChains = wallets.reduce((sum, wallet) => sum + (wallet.chains?.length || 0), 0);
  const totalTokens = wallets.reduce((sum, wallet) => sum + (wallet.chains?.reduce((chainSum, chain) => chainSum + 1, 0) || 0), 0);

  return (
    <TooltipProvider>
      <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Wallet Vault</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">Manage your multi-chain cryptocurrency portfolio</p>
        </div>
        
        {/* Header Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">Normal</span>
          </div>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={refreshBalances}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
                className="border-blue-300 hover:border-blue-400 hover:bg-blue-50 dark:border-blue-600 dark:hover:border-blue-500 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh wallet balances and data</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white border-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Wallet
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Create a new wallet</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Summary Cards - Beautiful gradient design */}
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
            Overview
          </button>
          <button
            onClick={() => setActiveTab('wallets')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'wallets'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Wallets
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Analytics
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Portfolio Distribution</h3>
              <div className="space-y-3">
                {wallets.map((wallet) => (
                  <div key={wallet.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{wallet.wallet_name}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      ${wallet.total_value_usd.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No recent transactions
              </div>
            </div>
            
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Wallet
                </Button>
                <Button 
                  onClick={refreshBalances}
                  variant="outline"
                  size="sm"
                  className="w-full border-blue-300 hover:border-blue-400 hover:bg-blue-50 dark:border-blue-600 dark:hover:border-blue-500 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Balances
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'wallets' && (
        <div className="space-y-6">
          {wallets.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No wallets found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create your first wallet to get started with blockchain operations.
              </p>
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Wallet
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {wallets.map((wallet) => (
                <div key={wallet.id} className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {wallet.wallet_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ID: {wallet.bw_id}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${wallet.total_value_usd.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {wallet.chains?.length || 0} chains
                      </div>
                    </div>
                  </div>
                  
                  {wallet.chains && wallet.chains.length > 0 && (
                    <div className="space-y-2">
                      {wallet.chains.map((chain, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{chain.chain}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{chain.address}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900 dark:text-white">
                              ${chain.usd_value.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {chain.balance} tokens
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Portfolio Performance</h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Analytics coming soon...
              </div>
            </div>
            
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Chain Distribution</h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Analytics coming soon...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="mt-8 flex justify-center">
        <div className="flex items-center space-x-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setMode('chat')}
                variant={mode === 'chat' ? 'default' : 'outline'}
                className={`flex items-center space-x-2 ${
                  mode === 'chat' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50 dark:border-blue-600 dark:hover:border-blue-500 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300'
                }`}
              >
                <MessageCircle className="h-4 w-4" />
                <span>PAYAi Chat Mode</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Switch to AI-powered chat interface</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setMode('manual')}
                variant={mode === 'manual' ? 'default' : 'outline'}
                className={`flex items-center space-x-2 ${
                  mode === 'manual' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50 dark:border-blue-600 dark:hover:border-blue-500 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Manual Mode</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Switch to manual wallet management</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Mode Content */}
      {mode === 'chat' && <ChatInterface />}
      {mode === 'manual' && <ManualInterface wallets={wallets} onWalletsUpdate={loadWallets} />}

      {/* Create Wallet Modal */}
      <CreateWalletModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onWalletCreated={() => {
          setIsCreateModalOpen(false);
          loadWallets();
        }}
      />
      </div>
    </TooltipProvider>
  );
}
