//Path: components/manual/ChainSelector.tsx

'use client';

import { useState } from 'react';
import { useSDK } from '@/hooks/useSDK';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw, Copy } from 'lucide-react';

interface WalletChain {
  chain: string;
  address: string;
  balance?: string;
  native_balance?: string;
}

interface WalletData {
  id: number;
  bw_id: number;
  wallet_name: string;
  chains: WalletChain[];
}

interface ChainSelectorProps {
  selectedWallet: WalletData | null;
  selectedChain: string;
  onChainChange: (chain: string) => void;
  onWalletsUpdate: () => void;
}

const availableChains = [
  { id: 'sepolia', name: 'Sepolia Testnet', symbol: 'ETH', color: 'bg-blue-500' },
  { id: 'amoy', name: 'Polygon Amoy', symbol: 'POL', color: 'bg-purple-500' },
  { id: 'neon', name: 'Neon EVM', symbol: 'NEON', color: 'bg-green-500' },
];

export default function ChainSelector({ 
  selectedWallet, 
  selectedChain, 
  onChainChange, 
  onWalletsUpdate 
}: ChainSelectorProps) {
  const [newChain, setNewChain] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const { sdkReady, sdk } = useSDK();

  const addChainAddress = async () => {
    if (!sdkReady || !selectedWallet || !newChain) return;

    setIsAdding(true);
    setError('');

    try {
      const response = await sdk.cryptoWallet.addChainAddress(selectedWallet.bw_id, {
        chain_id: newChain
      });
      
      if (response.success || response.data) {
        setNewChain('');
        onWalletsUpdate(); // Trigger parent to refresh wallet data
      } else {
        setError(response.error || 'Failed to add chain address');
      }
    } catch (err: any) {
      console.error('Failed to add chain address:', err);
      setError(err.message || 'Failed to add chain address');
    } finally {
      setIsAdding(false);
    }
  };

  const refreshBalance = async (chainId: string) => {
    if (!sdkReady || !selectedWallet) return;

    setIsRefreshing(true);
    try {
      // Get fresh balance data
      await sdk.cryptoWallet.balance.getChain(selectedWallet.bw_id, chainId);
      onWalletsUpdate(); // Trigger parent to refresh
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
  };

  const getAvailableChainsToAdd = () => {
    if (!selectedWallet) return availableChains;
    
    const connectedChains = selectedWallet.chains.map(c => c.chain);
    return availableChains.filter(chain => !connectedChains.includes(chain.id));
  };

  const getChainInfo = (chainId: string) => {
    return availableChains.find(chain => chain.id === chainId);
  };

  if (!sdkReady) {
    return (
      <div className="text-center py-8">
        <LoadingSpinner />
        <p className="text-muted-foreground mt-2">Loading chain data...</p>
      </div>
    );
  }

  if (!selectedWallet) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Select a wallet to manage chain addresses</p>
      </div>
    );
  }

  const availableChainsToAdd = getAvailableChainsToAdd();

  return (
    <div className="space-y-6">
      {/* Current Chain Selection */}
      <div className="space-y-2">
        <h4 className="font-medium">Active Chain</h4>
        <Select value={selectedChain} onValueChange={onChainChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select chain" />
          </SelectTrigger>
          <SelectContent>
            {selectedWallet.chains.map((chain) => {
              const chainInfo = getChainInfo(chain.chain);
              return (
                <SelectItem key={chain.chain} value={chain.chain}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${chainInfo?.color}`} />
                    {chainInfo?.name || chain.chain}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Connected Chains */}
      <div className="space-y-3">
        <h4 className="font-medium">Connected Chains ({selectedWallet.chains.length})</h4>
        
        <div className="space-y-3">
          {selectedWallet.chains.map((chain, index) => {
            const chainInfo = getChainInfo(chain.chain);
            const isSelected = chain.chain === selectedChain;
            
            return (
              <div 
                key={index} 
                className={`p-4 border rounded-lg transition-all ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${chainInfo?.color}`} />
                    <Badge variant={isSelected ? "default" : "secondary"}>
                      {chainInfo?.name || chain.chain}
                    </Badge>
                    {isSelected && (
                      <Badge variant="outline" className="text-primary">
                        Active
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyAddress(chain.address)}
                      title="Copy address"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => refreshBalance(chain.chain)}
                      disabled={isRefreshing}
                      title="Refresh balance"
                    >
                      <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground font-mono mb-2 break-all">
                  {chain.address}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">USDC Balance</p>
                    <p className="font-mono">{chain.balance || '0.00'} USDC</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Native Balance</p>
                    <p className="font-mono">{chain.native_balance || '0.00'} {chainInfo?.symbol}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add New Chain */}
      {availableChainsToAdd.length > 0 && (
        <div className="p-4 bg-muted/50 rounded-lg border-dashed border-2">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Add Chain Address
          </h4>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Select value={newChain} onValueChange={setNewChain}>
                <SelectTrigger>
                  <SelectValue placeholder="Select chain to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableChainsToAdd.map((chain) => (
                    <SelectItem key={chain.id} value={chain.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${chain.color}`} />
                        {chain.name}
                        <Badge variant="outline" className="text-xs">{chain.symbol}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                {error}
              </div>
            )}

            <Button
              onClick={addChainAddress}
              disabled={isAdding || !newChain || !sdkReady}
              className="w-full gradient-primary text-white border-0"
            >
              {isAdding ? (
                <>
                  <LoadingSpinner className="mr-2" size="sm" />
                  Adding Address...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Chain Address
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {availableChainsToAdd.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm bg-muted/30 rounded-lg border-dashed border-2">
          <p>All supported chains have been added to this wallet</p>
          <p className="text-xs mt-1">Sepolia, Amoy, and Neon EVM are connected</p>
        </div>
      )}
    </div>
  );
}