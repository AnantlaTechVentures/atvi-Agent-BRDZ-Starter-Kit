//Path: app/manual/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSDK } from '@/hooks/useSDK';
import { useToast } from '@/hooks/use-toast';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CreateWalletModal } from '@/components/manual/CreateWalletModal';
import { ImportTokenModal } from '@/components/manual/ImportTokenModal';
import { WalletDetailSidebar } from '@/components/manual/WalletDetailSidebar';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  ChevronDown, 
  MoreHorizontal, 
  Wallet2, 
  Download,
  Filter,
  SortAsc,
  Trash2,
  Edit,
  Copy,
  RefreshCw
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface WalletData {
  id: number;
  bw_id: number;
  wallet_name: string;
  total_chains?: number;
  active_chains?: number;
  total_tokens?: number;
  total_value_usd?: number;
  chain_names?: string[];
  chains?: any[];
  status?: string;
  created_at: string;
}

// Supported chains for crosschain operations  
const supportedChains = [
  { id: 'sepolia', name: 'Sepolia Testnet', icon: '🔷', color: 'bg-blue-500' },
  { id: 'amoy', name: 'Polygon Amoy', icon: '🟣', color: 'bg-purple-500' },
  { id: 'neon', name: 'Neon EVM', icon: '🟢', color: 'bg-green-500' }
];

export default function ManualPage() {
  const { isAuthenticated, ekycStatus, isLoading: authLoading } = useRequireAuth();
  const { user } = useAuth();
  const { sdk, isReady, canMakeRequests } = useSDK();
  const { toast } = useToast();
  
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToken, setSelectedToken] = useState('all');
  const [selectedChain, setSelectedChain] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deletingWallet, setDeletingWallet] = useState<number | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<WalletData | null>(null);
  const [importTargetWallet, setImportTargetWallet] = useState<WalletData | null>(null);
  const [testApiFeedback, setTestApiFeedback] = useState<string | null>(null);
  const [isArchivedWallets, setIsArchivedWallets] = useState(false);
  const [archivingWallet, setArchivingWallet] = useState<number | null>(null);
  
  // Professional confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'archive' | 'delete' | 'restore';
    walletId: number;
    walletName: string;
    message: string;
  } | null>(null);
  
  // Cache for wallet balances to improve performance
  const [balanceCache, setBalanceCache] = useState<{ [key: number]: { value: number; timestamp: number } }>({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Check if balance is cached and still valid
  const getCachedBalance = (walletId: number): number | null => {
    const cached = balanceCache[walletId];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📦 Using cached balance for wallet ${walletId}: ${cached.value}`);
      return cached.value;
    }
    return null;
  };

  // Cache a wallet balance
  const cacheBalance = (walletId: number, value: number) => {
    setBalanceCache(prev => ({
      ...prev,
      [walletId]: { value, timestamp: Date.now() }
    }));
    console.log(`💾 Cached balance for wallet ${walletId}: ${value}`);
  };

  // Clear cache for fresh data
  const clearBalanceCache = () => {
    setBalanceCache({});
    console.log('🗑️ Balance cache cleared');
  };

  // FIXED: Function to calculate total USD value with caching for performance
  const calculateWalletTotalValue = async (wallet: WalletData): Promise<number> => {
    if (!canMakeRequests) {
      console.log('❌ SDK not ready for balance calculation');
      return 0;
    }

    // Check cache first for instant response
    const cachedValue = getCachedBalance(wallet.bw_id);
    if (cachedValue !== null) {
      return cachedValue;
    }

    try {
      console.log(`🔍 Calculating balance for wallet: ${wallet.wallet_name} (bw_id: ${wallet.bw_id})`);
      
      let totalValue = 0;
      
      // Try multiple balance calculation methods
      try {
        // Method 1: Try getTotal API
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
      
      // Method 2: Try to get individual chain balances if getTotal fails
      if (totalValue === 0 && wallet.chains && wallet.chains.length > 0) {
        console.log(`🔄 Trying individual chain balance calculation...`);
        try {
          for (const chain of wallet.chains) {
            if (chain.chain_id) {
              const chainBalance = await sdk.cryptoWallet.balance.getChain(wallet.bw_id, chain.chain_id);
              console.log(`🔗 Chain ${chain.chain_id} balance:`, chainBalance);
              
              if (chainBalance?.success && chainBalance?.data) {
                const chainValue = chainBalance.data.total_value_usd || 0;
                totalValue += chainValue;
                console.log(`💰 Added chain value: ${chainValue}`);
              }
            }
          }
        } catch (chainError) {
          console.error(`⚠️ Individual chain balance failed:`, chainError);
        }
      }
      
      // Method 3: Use backend value if all else fails
      if (totalValue === 0 && wallet.total_value_usd) {
        console.log(`🔄 Using backend value: ${wallet.total_value_usd}`);
        totalValue = wallet.total_value_usd;
      }
      
      console.log(`💰 Final total value for ${wallet.wallet_name}: ${totalValue}`);
      
      // Cache the calculated balance for future use
      cacheBalance(wallet.bw_id, totalValue);
      
      return totalValue;
      
    } catch (error) {
      console.error('❌ Error calculating wallet total value:', error);
      // Return backend value as fallback
      const fallbackValue = wallet.total_value_usd || 0;
      cacheBalance(wallet.bw_id, fallbackValue);
      return fallbackValue;
    }
  };

  const showArchiveConfirmation = (walletId: number, walletName: string) => {
    setConfirmAction({
      type: 'archive',
      walletId,
      walletName,
      message: `Are you sure you want to archive "${walletName}"? This wallet will be hidden from your active wallets but can be restored later.`
    });
    setShowConfirmModal(true);
  };

  const archiveWallet = async (walletId: number) => {
    if (!canMakeRequests) return;

    try {
      setArchivingWallet(walletId);
      
      // Get user ID from localStorage
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Find the wallet to get the correct bw_id
      const targetWallet = wallets.find(w => w.id === walletId);
      if (!targetWallet) {
        throw new Error('Wallet not found in local state');
      }
      
      console.log('=== ARCHIVE WALLET DEBUG ===');
      console.log('Frontend wallet.id:', walletId);
      console.log('Backend bw_id to use:', targetWallet.bw_id);
      console.log('User ID:', userId);
      
      // For now, we'll just mark it as archived in local state
      // TODO: Implement actual archive API call when available
      setWallets(prev => prev.map(w => 
        w.id === walletId 
          ? { ...w, status: 'archived' }
          : w
      ));
      
      console.log('Wallet archived successfully');
      toast({
        title: "Wallet Archived",
        description: "Wallet has been successfully archived and hidden from active wallets.",
        variant: "default",
      });
    } catch (error: any) {
      console.error('Failed to archive wallet:', error);
      toast({
        title: "Archive Failed",
        description: `Failed to archive wallet: ${error.message || 'Network error'}`,
        variant: "destructive",
      });
    } finally {
      setArchivingWallet(null);
    }
  };

  const restoreWallet = async (walletId: number) => {
    if (!canMakeRequests) return;

    try {
      // Find the wallet to restore
      const targetWallet = wallets.find(w => w.id === walletId);
      if (!targetWallet) {
        throw new Error('Wallet not found in local state');
      }
      
      // Mark wallet as active again
      setWallets(prev => prev.map(w => 
        w.id === walletId 
          ? { ...w, status: 'active' }
          : w
      ));
      
      console.log('Wallet restored successfully');
      toast({
        title: "Wallet Restored",
        description: "Wallet has been successfully restored and is now visible in active wallets.",
        variant: "default",
      });
    } catch (error: any) {
      console.error('Failed to restore wallet:', error);
      toast({
        title: "Restore Failed",
        description: `Failed to restore wallet: ${error.message || 'Network error'}`,
        variant: "destructive",
      });
    }
  };

  const showDeleteConfirmation = (walletId: number, walletName: string) => {
    setConfirmAction({
      type: 'delete',
      walletId,
      walletName,
      message: `Are you sure you want to permanently delete "${walletName}"? This action cannot be undone and all associated data will be lost permanently.`
    });
    setShowConfirmModal(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    
    setShowConfirmModal(false);
    
    try {
      switch (confirmAction.type) {
        case 'archive':
          await archiveWallet(confirmAction.walletId);
          break;
        case 'delete':
          await deleteWallet(confirmAction.walletId);
          break;
        case 'restore':
          await restoreWallet(confirmAction.walletId);
          break;
      }
    } catch (error) {
      console.error('Action failed:', error);
    }
    
    setConfirmAction(null);
  };

  const deleteWallet = async (walletId: number) => {
    if (!canMakeRequests) return;

    try {
      setDeletingWallet(walletId);
      
      // Get user ID from localStorage
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Find the wallet to get the correct bw_id
      const targetWallet = wallets.find(w => w.id === walletId);
      if (!targetWallet) {
        throw new Error('Wallet not found in local state');
      }
      
      console.log('=== DELETE WALLET DEBUG ===');
      console.log('Frontend wallet.id:', walletId);
      console.log('Backend bw_id to use:', targetWallet.bw_id);
      console.log('User ID:', userId);
      console.log('Request data:', {
        confirmation: "delete",
        user_id: parseInt(userId)
      });
      console.log('===========================');
      
      // Use bw_id (not id) for the API call
      const response = await sdk.cryptoWallet.deleteWallet(targetWallet.bw_id, {
        confirmation: "delete",
        user_id: parseInt(userId)
      });

      console.log('Delete response:', response);

      if (response?.success || response?.data) {
        // Remove wallet from state using the original walletId
        setWallets(prev => prev.filter(w => w.id !== walletId));
        console.log('Wallet deleted successfully');
        toast({
          title: "Wallet Deleted",
          description: "Wallet has been permanently deleted from the system.",
          variant: "default",
        });
      } else {
        console.error('Delete failed:', response);
        toast({
          title: "Delete Failed",
          description: `Failed to delete wallet: ${response?.error || response?.message || 'Unknown error'}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Failed to delete wallet:', error);
      toast({
        title: "Delete Failed",
        description: `Failed to delete wallet: ${error.message || 'Network error'}`,
        variant: "destructive",
      });
    } finally {
      setDeletingWallet(null);
    }
  };

  // Handle import token with wallet selection
  const handleImportToken = (wallet?: WalletData) => {
    if (wallet) {
      // Import to specific wallet (dari dropdown atau sidebar)
      setImportTargetWallet(wallet);
      setIsImportModalOpen(true);
    } else if (wallets.length === 1) {
      // Auto-select if only one wallet
      setImportTargetWallet(wallets[0]);
      setIsImportModalOpen(true);
    } else if (wallets.length > 1) {
      // Multiple wallets - auto select first one or show selection
      setImportTargetWallet(wallets[0]); // ← Fix: Select first wallet
      setIsImportModalOpen(true);
    } else {
      // No wallets available
      toast({
        title: "No Wallets Found",
        description: "Please create a wallet first before importing tokens.",
        variant: "destructive",
      });
    }
  };

  // Callback when token imported successfully
  const handleTokenImported = () => {
    console.log('Token imported successfully, reloading wallets...');
    loadWallets(); // Refresh wallet list to update token counts
  };

  // FIXED: Handle wallet selection with proper state reset
  const handleWalletSelect = (wallet: WalletData) => {
    console.log('Selecting wallet:', wallet.wallet_name, 'bw_id:', wallet.bw_id);
    
    // If same wallet is selected, close sidebar
    if (selectedWallet && selectedWallet.bw_id === wallet.bw_id) {
      setSelectedWallet(null);
      return;
    }
    
    // Set new selected wallet - this will trigger useEffect in WalletDetailSidebar
    setSelectedWallet(wallet);
  };

  // FIXED: Handle sidebar close with proper cleanup
  const handleSidebarClose = () => {
    console.log('Closing sidebar and resetting selection');
    setSelectedWallet(null);
  };

  // Filters
  const filteredWallets = wallets.filter(wallet => {
    const matchesSearch = wallet.wallet_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArchiveStatus = isArchivedWallets 
      ? wallet.status === 'archived' 
      : wallet.status !== 'archived';
    
    return matchesSearch && matchesArchiveStatus;
  });

  // FIXED: Load wallets with balance calculation but optimized for performance
  const loadWallets = async () => {
    if (!canMakeRequests || !user?.user_id) return;

    try {
      setIsLoading(true);
      const userId = typeof user.user_id === 'string' ? parseInt(user.user_id) : user.user_id;
      
      console.log('🚀 Loading wallets for user:', userId);
      
      const response = await sdk.cryptoWallet.getUserWallets(userId);
      
      console.log('📦 Raw wallet API response:', response);
      
      if (response?.success && response?.data?.wallets) {
        console.log(`🔢 Found ${response.data.wallets.length} wallets, calculating balances...`);
        
        // Load wallets with balance calculation (restored functionality)
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
            
            // Calculate actual total USD value from balance data
            console.log(`💰 Calculating balance for wallet: ${walletObj.wallet_name}`);
            const calculatedValue = await calculateWalletTotalValue(walletObj);
            
            const finalWallet = {
              ...walletObj,
              total_value_usd: calculatedValue // Use calculated value instead of backend value
            };
            
            console.log(`✅ Final wallet data:`, {
              name: finalWallet.wallet_name,
              bw_id: finalWallet.bw_id,
              calculated_value: calculatedValue,
              chains: finalWallet.chains?.length || 0,
              tokens: finalWallet.total_tokens
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
      setWallets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isReady && isAuthenticated && user && canMakeRequests) {
      loadWallets();
    }
  }, [isReady, isAuthenticated, user, canMakeRequests]);

  if (authLoading || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || ekycStatus !== 'APPROVED') {
    return null;
  }

  return (
    <ProtectedLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">Wallets</h1>
            <Button
              variant={isArchivedWallets ? "default" : "outline"}
              size="default"
              onClick={() => setIsArchivedWallets(!isArchivedWallets)}
              className="ml-4 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2"
              title={isArchivedWallets ? "View Active Wallets" : "Open Archived Wallets"}
            >
              {isArchivedWallets ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-14 0h14" />
                </svg>
              )}
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearBalanceCache();
                loadWallets();
              }}
              disabled={isLoading}
              className="mr-2"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {!isArchivedWallets && (
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Wallet
              </Button>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-card rounded-lg border">
          {/* Search */}
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Address Filter */}
          <Input placeholder="Address" className="w-48" />

          {/* Token Filter */}
          <Select value={selectedToken} onValueChange={setSelectedToken}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Token" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tokens</SelectItem>
              <SelectItem value="usdc">USDC</SelectItem>
              <SelectItem value="eth">ETH</SelectItem>
            </SelectContent>
          </Select>

          {/* Blockchain Filter */}
          <Select value={selectedChain} onValueChange={setSelectedChain}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Blockchain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Chains</SelectItem>
              <SelectItem value="sepolia">Sepolia</SelectItem>
              <SelectItem value="amoy">Amoy</SelectItem>
              <SelectItem value="neon">Neon</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort By:" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="value">USD Value</SelectItem>
              <SelectItem value="date">Date Created</SelectItem>
            </SelectContent>
          </Select>

          {/* Export Button */}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Import Token Notice */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {filteredWallets.length} Wallets
            </span>
            <span className="text-sm text-muted-foreground">
              The token you're searching for isn't here?{' '}
              <Button 
                variant="link" 
                className="h-auto p-0 text-blue-600"
                onClick={() => handleImportToken()}
              >
                Import token
              </Button>
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>1 to {filteredWallets.length} of {filteredWallets.length}</span>
            <Button variant="ghost" size="sm" disabled>Previous</Button>
            <Badge variant="default">1</Badge>
            <Button variant="ghost" size="sm" disabled>Next</Button>
          </div>
        </div>

        {/* Wallets List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12">
              <LoadingSpinner />
              <p className="text-muted-foreground mt-2">Loading wallets...</p>
            </div>
          ) : filteredWallets.length === 0 ? (
            <div className="text-center py-12">
              <Wallet2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-semibold mb-2">No wallets found</h3>
              <p className="text-muted-foreground">Create your first wallet to get started</p>
            </div>
          ) : (
            filteredWallets.map((wallet) => (
              <div 
                key={wallet.id} 
                className={`p-4 bg-card rounded-lg border hover:shadow-sm transition-shadow cursor-pointer ${
                  selectedWallet && selectedWallet.bw_id === wallet.bw_id 
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' 
                    : ''
                }`}
                onClick={() => handleWalletSelect(wallet)}
              >
                <div className="flex items-center justify-between">
                  {/* Wallet Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                      <Wallet2 className="h-4 w-4 text-blue-600" />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{wallet.wallet_name}</h3>
                        <Badge variant="outline" className="text-xs">
                          ID: {wallet.bw_id}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{wallet.active_chains || 0} Addresses Chains</span>
                        <span>{wallet.total_tokens || 0} Tokens</span>
                      </div>
                    </div>
                  </div>

                    {/* FIXED: Wallet Value & Actions - Show correct calculated balance */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">
                          ≈ ${(wallet.total_value_usd || 0).toFixed(2)}
                        </p>
                        {wallet.total_value_usd && wallet.total_value_usd > 0 && (
                          <p className="text-xs text-green-600">
                            Balance found
                          </p>
                        )}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            disabled={deletingWallet === wallet.id}
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent wallet selection when clicking menu
                            }}
                          >
                            {deletingWallet === wallet.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(wallet.wallet_name);
                          }}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Name
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleImportToken(wallet);
                          }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Import Token
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Wallet
                          </DropdownMenuItem>
                          {!isArchivedWallets ? (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                showArchiveConfirmation(wallet.id, wallet.wallet_name);
                              }}
                              className="text-amber-600 focus:text-amber-600"
                              disabled={archivingWallet === wallet.id}
                            >
                              {archivingWallet === wallet.id ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-14 0h14" />
                                </svg>
                              )}
                              {archivingWallet === wallet.id ? 'Archiving...' : 'Archive Wallet'}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                restoreWallet(wallet.id);
                              }}
                              className="text-green-600 focus:text-green-600"
                            >
                              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Restore Wallet
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              showDeleteConfirmation(wallet.id, wallet.wallet_name);
                            }}
                            className="text-destructive focus:text-destructive"
                            disabled={deletingWallet === wallet.id}
                          >
                            {deletingWallet === wallet.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            {deletingWallet === wallet.id ? 'Deleting...' : 'Delete Wallet'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* FIXED: Wallet Detail Sidebar with proper handlers */}
        <WalletDetailSidebar
          wallet={selectedWallet}
          isOpen={!!selectedWallet}
          onClose={handleSidebarClose}
          onImportToken={(wallet) => handleImportToken(wallet)}
        />

        {/* Create Wallet Modal */}
        <CreateWalletModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onWalletCreated={loadWallets}
        />

        {/* Import Token Modal */}
        <ImportTokenModal
          isOpen={isImportModalOpen}
          onClose={() => {
            setIsImportModalOpen(false);
            setImportTargetWallet(null);
          }}
          onTokenImported={handleTokenImported}
          selectedWallet={importTargetWallet}
        />

        {/* Professional Confirmation Modal */}
        {showConfirmModal && confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full mx-4">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    confirmAction.type === 'archive' ? 'bg-amber-100 dark:bg-amber-900/20' :
                    confirmAction.type === 'delete' ? 'bg-red-100 dark:bg-red-900/20' :
                    'bg-green-100 dark:bg-green-900/20'
                  }`}>
                    {confirmAction.type === 'archive' && (
                      <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-14 0h14" />
                      </svg>
                    )}
                    {confirmAction.type === 'delete' && (
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                    {confirmAction.type === 'restore' && (
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {confirmAction.type === 'archive' ? 'Archive Wallet' :
                       confirmAction.type === 'delete' ? 'Delete Wallet' :
                       'Restore Wallet'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {confirmAction.walletName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Message */}
              <div className="p-6">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {confirmAction.message}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmModal(false)}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmAction}
                  className={`${
                    confirmAction.type === 'archive' ? 'bg-amber-600 hover:bg-amber-700' :
                    confirmAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-green-600 hover:bg-green-700'
                  } text-white border-0`}
                >
                  {confirmAction.type === 'archive' ? 'Archive' :
                   confirmAction.type === 'delete' ? 'Delete' :
                   'Restore'}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Toast Notifications */}
        <Toaster />
      </div>
    </ProtectedLayout>
  );
}