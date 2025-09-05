//Path: components/manual/WalletDetailSidebar.tsx

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSDK } from '@/hooks/useSDK';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  X, 
  Search, 
  Copy,
  ExternalLink,
  Plus,
  ChevronRight,
  AlertCircle,
  Coins,
  RefreshCw
} from 'lucide-react';

interface Chain {
  chain_id: string;
  network: string;
  wallet_address: string;
  bw_id: number;
  has_address: boolean;
  token_count?: number;
  tokens?: any[];
  native_symbol?: string;
}

interface WalletData {
  id: number;
  bw_id: number;
  wallet_name: string;
  total_chains?: number;
  active_chains?: number;
  total_tokens?: number;
  total_value_usd?: number;
  chain_names?: string[];
  chains?: Chain[];
  status?: string;
  created_at: string;
}

interface WalletDetailSidebarProps {
  wallet: WalletData | null;
  isOpen: boolean;
  onClose: () => void;
  onImportToken?: (wallet: WalletData) => void;
}

const chainIcons: { [key: string]: string } = {
  sepolia: '🔷',
  amoy: '🟣', 
  neon: '🟢',
  ethereum: '⚪',
  polygon: '🟣',
  bnb: '🟡'
};

const getChainDisplayName = (chainId: string): string => {
  const names: { [key: string]: string } = {
    sepolia: 'Sepolia Testnet',
    amoy: 'Polygon Amoy',
    neon: 'Neon EVM',
  };
  return names[chainId] || chainId.charAt(0).toUpperCase() + chainId.slice(1);
};

const getNativeSymbol = (chainId: string, chainBalance?: any, address?: any): string => {
  const fallbackSymbols: { [key: string]: string } = { 
    sepolia: 'ETH', 
    amoy: 'MATIC', 
    neon: 'NEON' 
  };
  return chainBalance?.native_symbol || 
         address?.native_symbol || 
         fallbackSymbols[chainId] || 
         'UNKNOWN';
};

export function WalletDetailSidebar({ wallet, isOpen, onClose, onImportToken }: WalletDetailSidebarProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'tokens' | 'defi' | 'risks'>('tokens');
  const [searchQuery, setSearchQuery] = useState('');
  const [userTokens, setUserTokens] = useState<any>({});
  const [chainBalances, setChainBalances] = useState<{ [key: string]: any }>({});
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [walletAddresses, setWalletAddresses] = useState<any[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const { sdk, canMakeRequests } = useSDK();

  // Fetch wallet data when wallet changes or tab switches to tokens
  useEffect(() => {
    if (wallet?.bw_id && activeTab === 'tokens' && canMakeRequests) {
      fetchWalletData();
    }
  }, [wallet?.bw_id, activeTab, canMakeRequests]);

  if (!wallet) return null;

  const fetchWalletData = async () => {
    if (!wallet || !canMakeRequests || !user?.user_id) return;
    
    console.log('🔄 Fetching wallet data for bw_id:', wallet.bw_id);
    console.log('🔄 Fetching wallet data for user_id:', user.user_id);
    
    try {
      // Set loading states
      setIsLoadingTokens(true);
      setIsLoadingBalances(true);
      setIsLoadingAddresses(true);

      // 1. Get wallet addresses
      const addressesResponse = await sdk.cryptoWallet.getWalletAddresses(wallet.bw_id);
      console.log('📍 RAW API Response:', addressesResponse);
      console.log('📍 Response data addresses:', addressesResponse?.data?.addresses);
      console.log('📍 Addresses array length:', addressesResponse?.data?.addresses?.length);
      
      if (addressesResponse?.success && addressesResponse?.data?.addresses && Array.isArray(addressesResponse.data.addresses)) {
        console.log('✅ Setting walletAddresses to:', addressesResponse.data.addresses);
        setWalletAddresses(addressesResponse.data.addresses);
      } else {
        console.log('❌ No addresses found - setting empty array');
        setWalletAddresses([]);
      }
      setIsLoadingAddresses(false);

      // 2. Get user tokens
      const userId = typeof user.user_id === 'string' ? parseInt(user.user_id) : user.user_id;
      const tokensResponse = await sdk.cryptoWallet.tokens.getImported(userId);
      
      console.log('🎯 User tokens API response:', tokensResponse);
      
      if (tokensResponse?.success && tokensResponse?.data) {
        setUserTokens(tokensResponse.data);
        console.log('✅ User tokens loaded:', tokensResponse.data);
      } else {
        setUserTokens({});
        console.log('❌ No tokens found or API failed');
      }
      setIsLoadingTokens(false);

      // 3. Get balance for this specific wallet
      try {
        const balanceResponse = await sdk.cryptoWallet.balance.getTotal(wallet.bw_id);
        console.log('💰 Raw Balance API response:', JSON.stringify(balanceResponse, null, 2));
        
        if (balanceResponse?.success || balanceResponse?.data) {
          const responseData = balanceResponse.data || balanceResponse;
          console.log('💰 Response data structure:', JSON.stringify(responseData, null, 2));
          
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
            setChainBalances(chainsData);
            console.log('✅ Chain balances loaded:', chainsData);
          } else {
            setChainBalances({});
            console.log('❌ No chains data found in response');
          }
        } else {
          setChainBalances({});
          console.log('❌ No balance data found - API response not successful');
        }
      } catch (balanceError) {
        console.error('💰 Balance API error (skipping):', balanceError);
        setChainBalances({});
      }
      setIsLoadingBalances(false);

    } catch (error) {
      console.error('❌ Failed to fetch wallet data:', error);
      setUserTokens({});
      setChainBalances({});
      setWalletAddresses([]);
      setIsLoadingTokens(false);
      setIsLoadingBalances(false);
      setIsLoadingAddresses(false);
    }
  };

  const handleImportToken = () => {
    if (onImportToken && wallet) {
      onImportToken(wallet);
    }
  };

  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered...');
    fetchWalletData();
  };

  // Group imported tokens by chain
  const tokensByChain = userTokens?.tokens_by_chain || {};
  
  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className={`
        fixed top-0 right-0 h-full w-96 bg-background border-l shadow-xl z-50
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <span className="text-xl">💼</span>
            </div>
            <div>
              <h2 className="font-semibold text-lg">{wallet.wallet_name}</h2>
              <p className="text-sm text-muted-foreground">
                bw_id: {wallet.bw_id} | ≈ ${wallet.total_value_usd?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b flex-shrink-0">
          <button
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tokens'
                ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('tokens')}
          >
            Tokens ({userTokens?.total_imported || 0})
          </button>
          <button
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'defi'
                ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('defi')}
          >
            DeFi Positions
          </button>
          <button
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'risks'
                ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('risks')}
          >
            Risks
          </button>
        </div>

        {/* Content - Scrollable Area */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
          {activeTab === 'tokens' && (
            <div className="p-4">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Find by address, blockchain, token or token + blockchain"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Import Token Button */}
              <div className="mb-4">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleImportToken}
                  disabled={isLoadingTokens}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Import Token
                </Button>
              </div>

              {/* Loading State */}
              {(isLoadingTokens || isLoadingBalances || isLoadingAddresses) && (
                <div className="text-center py-4">
                  <LoadingSpinner />
                  <p className="text-sm text-muted-foreground mt-2">
                    Loading wallet data...
                  </p>
                </div>
              )}

              {/* Chain List with Tokens */}
              <div className="space-y-3">
                {walletAddresses && walletAddresses.length > 0 ? (
                  walletAddresses.map((address, index) => {
                    const chainId = address.chain_id;
                    const chainTokens = tokensByChain[chainId] || [];
                    const chainBalance = chainBalances[chainId];

                    return (
                      <div key={address.address_id || index} className="border rounded-lg p-4">
                        {/* Chain Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{chainIcons[chainId] || '⚫'}</span>
                            <div>
                              <h3 className="font-medium">{getChainDisplayName(chainId)}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground font-mono">
                                  {address.wallet_address.slice(0, 8)}...{address.wallet_address.slice(-6)}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0"
                                  onClick={() => navigator.clipboard.writeText(address.wallet_address)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              ≈ ${chainBalance?.total_usd?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                        </div>

                        {/* Native Balance */}
                        <div className="mb-3 p-3 bg-muted/30 rounded">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Coins className="h-4 w-4" />
                              <span className="font-medium">
                                {getNativeSymbol(chainId, chainBalance, address)}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-sm">
                                {chainBalance?.native_balance 
                                  ? parseFloat(chainBalance.native_balance).toFixed(4)
                                  : '0.0000'
                                }
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* FIXED: Imported Tokens with Real Balance */}
                        {chainTokens.length > 0 ? (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">
                              Imported Tokens ({chainTokens.length})
                            </h4>
                            {chainTokens.map((token: any, tokenIndex: number) => {
                              // FIXED: Find matching token in chainBalance
                              const matchingBalanceToken = chainBalance?.tokens?.find(
                                (balanceToken: any) => {
                                  return balanceToken.symbol === token.symbol || 
                                         balanceToken.contract_address?.toLowerCase() === token.contract_address?.toLowerCase();
                                }
                              );
                              
                              const tokenBalance = matchingBalanceToken?.balance || '0.00';
                              const tokenValueUSD = matchingBalanceToken?.value_usd || 0;

                              return (
                                <div key={tokenIndex} className="flex items-center justify-between p-2 border rounded">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                      <span className="text-xs">{token.symbol?.charAt(0) || '?'}</span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm">{token.symbol || 'Unknown'}</p>
                                      <p className="text-xs text-muted-foreground font-mono">
                                        {token.contract_address?.slice(0, 6)}...{token.contract_address?.slice(-4)}
                                      </p>
                                      {matchingBalanceToken && (
                                        <p className="text-xs text-green-600">Balance found</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-mono text-sm">{parseFloat(tokenBalance).toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">${tokenValueUSD.toFixed(2)}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            <p className="text-sm">No imported tokens on {getChainDisplayName(chainId)}</p>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="mt-2 text-blue-600"
                              onClick={handleImportToken}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Import token for {getChainDisplayName(chainId)}
                            </Button>
                          </div>
                        )}

                        {/* FIXED: Show balance tokens even if not imported */}
                        {chainBalance?.tokens && chainBalance.tokens.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">
                              All Tokens on {getChainDisplayName(chainId)}
                            </h4>
                            {chainBalance.tokens.map((balanceToken: any, balanceIndex: number) => (
                              <div key={balanceIndex} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center">
                                    <span className="text-xs">{balanceToken.symbol?.charAt(0) || '?'}</span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{balanceToken.symbol}</p>
                                    <p className="text-xs text-muted-foreground">{balanceToken.name}</p>
                                    <p className="text-xs text-muted-foreground font-mono">
                                      {balanceToken.contract_address?.slice(0, 6)}...{balanceToken.contract_address?.slice(-4)}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-mono text-sm font-bold">{parseFloat(balanceToken.balance).toFixed(2)}</p>
                                  <p className="text-xs text-green-600">${balanceToken.value_usd.toFixed(2)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {isLoadingAddresses ? (
                      <div className="space-y-2">
                        <LoadingSpinner />
                        <p>Loading addresses...</p>
                      </div>
                    ) : (
                      <>
                        <p>No chains found for this wallet</p>
                        <Button variant="outline" size="sm" className="mt-2">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Chain
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Empty State for Tokens */}
              {walletAddresses.length > 0 && Object.keys(tokensByChain).length === 0 && !isLoadingTokens && (
                <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg mt-4">
                  <div className="text-muted-foreground mb-4">
                    <Plus className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <h3 className="font-medium mb-2">No tokens imported yet</h3>
                    <p className="text-sm">Import your first token to start tracking balances</p>
                  </div>
                  <Button onClick={handleImportToken}>
                    <Plus className="h-4 w-4 mr-2" />
                    Import Token
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'defi' && (
            <div className="p-4">
              <div className="text-center py-8 text-muted-foreground">
                <p>No DeFi positions found</p>
              </div>
            </div>
          )}

          {activeTab === 'risks' && (
            <div className="p-4">
              <div className="text-center py-8 text-muted-foreground">
                <p>No risks detected</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-muted/20 flex-shrink-0">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">
              Send
            </Button>
            <Button variant="outline" className="flex-1">
              Receive
            </Button>
            <Button variant="outline" className="flex-1">
              Swap
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}