'use client';

import { useState } from 'react';
import { useSDK } from '@/hooks/useSDK';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Wallet, Trash2, X, Search, Copy, ExternalLink } from 'lucide-react';

interface WalletChain {
  chain: string;
  address: string;
  balance: string;
  native_balance: string;
  logo?: string;
}

interface WalletData {
  id: number;
  bw_id: number;
  wallet_name: string;
  name: string;
  chains: WalletChain[];
  total_value_usd: number;
  created_at?: string;
  user_id?: number;
}

interface WalletControlsProps {
  wallets: WalletData[];
  onWalletsUpdate: () => void;
  selectedWallet: WalletData | null;
  onWalletSelect: (wallet: WalletData) => void;
}

// Supported chains for crosschain operations
const supportedChains = [
  { 
    id: 'sepolia', 
    name: 'Sepolia Testnet', 
    shortName: 'Sepolia',
    symbol: 'ETH', 
    color: 'bg-blue-500',
    icon: '🔷'
  },
  { 
    id: 'amoy', 
    name: 'Polygon Amoy', 
    shortName: 'Amoy',
    symbol: 'MATIC', 
    color: 'bg-purple-500',
    icon: '🟣'
  },
  { 
    id: 'neon', 
    name: 'Neon EVM', 
    shortName: 'Neon',
    symbol: 'NEON', 
    color: 'bg-green-500',
    icon: '🟢'
  }
];

export default function WalletControls({ 
  wallets, 
  onWalletsUpdate, 
  selectedWallet,
  onWalletSelect 
}: WalletControlsProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [walletName, setWalletName] = useState('');
  const [selectedChains, setSelectedChains] = useState<string[]>([]);
  const [chainSearch, setChainSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deletingWallet, setDeletingWallet] = useState<number | null>(null);
  const [error, setError] = useState('');
  const { sdkReady, sdk } = useSDK();

  const filteredChains = supportedChains.filter(chain =>
    chain.name.toLowerCase().includes(chainSearch.toLowerCase()) ||
    chain.symbol.toLowerCase().includes(chainSearch.toLowerCase())
  );

  const toggleChainSelection = (chainId: string) => {
    setSelectedChains(prev => 
      prev.includes(chainId) 
        ? prev.filter(id => id !== chainId)
        : [...prev, chainId]
    );
  };

  const createWalletWithChains = async () => {
    if (!sdkReady || !walletName.trim() || selectedChains.length === 0) return;

    setIsCreating(true);
    setError('');

    try {
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        throw new Error('User ID not found');
      }

      console.log('Creating wallet with chains:', { walletName, selectedChains });

      // Step 1: Create the wallet
      const walletResponse = await sdk.cryptoWallet.createWallet({
        wallet_name: walletName.trim(),
        user_id: parseInt(userId)
      });
      
      if (!walletResponse.success && !walletResponse.data) {
        throw new Error(walletResponse.error || 'Failed to create wallet');
      }

      const walletData = walletResponse.data || walletResponse;
      const walletId = walletData.id || walletData.wallet_id;
      
      console.log('Wallet created:', walletData);

      // Step 2: Add chain addresses for selected chains
      const chainPromises = selectedChains.map(async (chainId) => {
        try {
          console.log(`Adding chain ${chainId} to wallet ${walletId}`);
          const chainResponse = await sdk.cryptoWallet.addChainAddress(walletId, {
            chain_id: chainId
          });
          console.log(`Chain ${chainId} added:`, chainResponse);
          return chainResponse;
        } catch (chainError) {
          console.error(`Failed to add chain ${chainId}:`, chainError);
          return null;
        }
      });

      await Promise.all(chainPromises);

      // Reset form and close modal
      setWalletName('');
      setSelectedChains([]);
      setIsCreateModalOpen(false);
      onWalletsUpdate(); // Refresh wallet list

    } catch (err: any) {
      console.error('Failed to create wallet:', err);
      setError(err.message || 'Failed to create wallet');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteWallet = async (walletId: number, bwId: number) => {
    if (!sdkReady) return;

    setDeletingWallet(bwId);
    try {
      const userId = localStorage.getItem('user_id');
      const response = await sdk.cryptoWallet.deleteWallet(bwId, {
        confirmation: "delete",
        user_id: parseInt(userId || '0')
      });

      if (response.success || response.data) {
        onWalletsUpdate();
      } else {
        setError(response.error || 'Failed to delete wallet');
      }
    } catch (err: any) {
      console.error('Failed to delete wallet:', err);
      setError(err.message || 'Failed to delete wallet');
    } finally {
      setDeletingWallet(null);
    }
  };

  const calculateTotalUSDC = (wallet: WalletData) => {
    return wallet.chains.reduce((total, chain) => {
      return total + parseFloat(chain.balance || '0');
    }, 0);
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
  };

  const getExplorerUrl = (chain: string, address: string) => {
    const explorers: Record<string, string> = {
      sepolia: `https://sepolia.etherscan.io/address/${address}`,
      amoy: `https://amoy.polygonscan.com/address/${address}`,
      neon: `https://neonscan.org/address/${address}`
    };
    return explorers[chain] || '#';
  };

  if (!sdkReady) {
    return (
      <div className="text-center py-8">
        <LoadingSpinner />
        <p className="text-muted-foreground mt-2">Loading wallet controls...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create New Wallet */}
      <div className="p-4 bg-muted/50 rounded-lg border-dashed border-2">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          Create New Crosschain Wallet
        </h4>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gradient-primary text-white border-0">
              <Plus className="h-4 w-4 mr-2" />
              Add New Wallet
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Add New Wallet
                </DialogTitle>
              </div>
            </DialogHeader>
            
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Name this new wallet and add one or more blockchains in order to create an address for each blockchain added. Additional blockchains can be added to the wallet later.
              </p>
              
              {/* Wallet Name */}
              <div className="space-y-2">
                <Label htmlFor="walletName">Wallet Name *</Label>
                <Input
                  id="walletName"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="e.g., Trading Wallet, DeFi Portfolio..."
                  maxLength={50}
                />
              </div>

              {/* Add blockchains to wallet */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Add blockchains to wallet</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Find a Blockchain"
                      value={chainSearch}
                      onChange={(e) => setChainSearch(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
                
                {/* Testnets Section */}
                <div>
                  <h5 className="text-sm font-medium text-muted-foreground mb-3">Testnets</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {filteredChains.map((chain) => {
                      const isSelected = selectedChains.includes(chain.id);
                      return (
                        <div
                          key={chain.id}
                          onClick={() => toggleChainSelection(chain.id)}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                          }`}
                        >
                          <div className="text-center space-y-2">
                            <div className="text-2xl">{chain.icon}</div>
                            <p className="font-medium text-sm">{chain.shortName}</p>
                            <p className="text-xs text-muted-foreground">{chain.name}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Selected Count */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedChains.length} Selected
                </p>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setWalletName('');
                    setSelectedChains([]);
                    setError('');
                  }}
                  disabled={isCreating}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={createWalletWithChains}
                  disabled={isCreating || !walletName.trim() || selectedChains.length === 0}
                  className="flex-1 gradient-primary text-white border-0"
                >
                  {isCreating ? (
                    <>
                      <LoadingSpinner className="mr-2" size="sm" />
                      Creating Wallet...
                    </>
                  ) : (
                    'Create Wallet'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Existing Wallets */}
      <div className="space-y-3">
        <h4 className="font-medium flex items-center justify-between">
          Your Wallets ({wallets.length})
          {wallets.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              Total: ${wallets.reduce((sum, w) => sum + calculateTotalUSDC(w), 0).toFixed(2)} USDC
            </Badge>
          )}
        </h4>
        
        {wallets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Wallet className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No crosschain wallets found</p>
            <p className="text-sm">Create your first wallet to get started with crosschain operations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {wallets.map((wallet) => {
              const totalUSDC = calculateTotalUSDC(wallet);
              const isSelected = selectedWallet?.id === wallet.id;
              
              return (
                <div 
                  key={wallet.id}
                  className={`group border rounded-lg transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:bg-muted/50 hover:border-muted-foreground/30'
                  }`}
                >
                  {/* Wallet Header */}
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => onWalletSelect(wallet)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-medium truncate">{wallet.name}</h5>
                          {isSelected && (
                            <Badge variant="default" className="text-xs">
                              Selected
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 mb-2">
                          <p className="text-sm text-muted-foreground">
                            {wallet.chains.length} chain{wallet.chains.length !== 1 ? 's' : ''} connected
                          </p>
                          <p className="text-sm font-mono">
                            ${totalUSDC.toFixed(2)} USDC
                          </p>
                        </div>
                        
                        {/* Chain indicators */}
                        <div className="flex items-center gap-1">
                          {wallet.chains.map((chain, idx) => {
                            const chainInfo = supportedChains.find(c => c.id === chain.chain);
                            return (
                              <div
                                key={idx}
                                className={`w-2 h-2 rounded-full ${chainInfo?.color || 'bg-gray-400'}`}
                                title={`${chain.chain}: ${chain.balance} USDC`}
                              />
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        )}
                        
                        {!isSelected && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete wallet "${wallet.name}"? This action cannot be undone.`)) {
                                deleteWallet(wallet.id, wallet.bw_id);
                              }
                            }}
                            disabled={deletingWallet === wallet.bw_id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {deletingWallet === wallet.bw_id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Wallet Details (when selected) */}
                  {isSelected && wallet.chains.length > 0 && (
                    <div className="px-4 pb-4 border-t border-border/50">
                      <div className="mt-4 space-y-3">
                        {wallet.chains.map((chain, idx) => {
                          const chainInfo = supportedChains.find(c => c.id === chain.chain);
                          return (
                            <div key={idx} className="flex items-center justify-between p-3 bg-background rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="text-lg">{chainInfo?.icon}</div>
                                <div>
                                  <p className="font-medium text-sm">{chainInfo?.shortName}</p>
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {chain.address.slice(0, 6)}...{chain.address.slice(-4)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <p className="text-sm font-mono">{chain.balance} USDC</p>
                                  <p className="text-xs text-muted-foreground">
                                    {chain.native_balance} {chainInfo?.symbol}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyAddress(chain.address)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(getExplorerUrl(chain.chain, chain.address), '_blank')}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}