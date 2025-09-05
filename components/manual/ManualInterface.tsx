'use client';

import { useState, useEffect } from 'react';
import { useSDK } from '@/hooks/useSDK';
import WalletControls from '@/components/manual/WalletControls';
import TransactionForm from '@/components/manual/TransactionForm';
import ChainSelector from '@/components/manual/ChainSelector';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// Crosschain-focused interfaces
interface CrosschainData {
  chain: string;
  address: string;
  balance: string;
  native_balance: string;
  usd_value?: number;
}

interface CrosschainWalletData {
  id: number;
  bw_id: number;
  wallet_name: string;
  name: string;
  chains: CrosschainData[];
  total_value_usd: number;
  created_at?: string;
  user_id?: number;
}

interface ManualInterfaceProps {
  wallets: CrosschainWalletData[];
  onWalletsUpdate: () => void;
  isLoading?: boolean;
}

export default function ManualInterface({ 
  wallets, 
  onWalletsUpdate, 
  isLoading = false 
}: ManualInterfaceProps) {
  const [selectedWallet, setSelectedWallet] = useState<CrosschainWalletData | null>(null);
  const [selectedChain, setSelectedChain] = useState<string>('sepolia');
  const { sdkReady } = useSDK();

  // Auto-select first wallet when wallets load
  useEffect(() => {
    if (wallets.length > 0 && !selectedWallet) {
      setSelectedWallet(wallets[0]);
      // Auto-select first available chain
      if (wallets[0].chains.length > 0) {
        setSelectedChain(wallets[0].chains[0].chain);
      }
    }
    
    // Handle wallet removal
    if (selectedWallet && !wallets.find(w => w.bw_id === selectedWallet.bw_id)) {
      setSelectedWallet(wallets.length > 0 ? wallets[0] : null);
    }
  }, [wallets, selectedWallet]);

  // Update selected chain based on wallet's available chains
  useEffect(() => {
    if (selectedWallet && selectedWallet.chains.length > 0) {
      const currentChain = selectedWallet.chains.find(c => c.chain === selectedChain);
      if (!currentChain) {
        setSelectedChain(selectedWallet.chains[0].chain);
      }
    }
  }, [selectedWallet, selectedChain]);

  const handleWalletSelect = (wallet: CrosschainWalletData) => {
    setSelectedWallet(wallet);
    if (wallet.chains.length > 0) {
      setSelectedChain(wallet.chains[0].chain);
    }
  };

  const getTotalPortfolioValue = () => {
    return wallets.reduce((total, wallet) => total + (wallet.total_value_usd || 0), 0);
  };

  const getActiveChains = () => {
    const chains = new Set<string>();
    wallets.forEach(wallet => {
      wallet.chains.forEach(chain => chains.add(chain.chain));
    });
    return Array.from(chains);
  };

  if (!sdkReady) {
    return (
      <div className="bg-card rounded-xl border">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Crosschain Operations</h3>
          <p className="text-sm text-muted-foreground">
            Initializing crosschain SDK...
          </p>
        </div>
        <div className="p-8 text-center">
          <LoadingSpinner />
          <p className="text-muted-foreground mt-2">Loading crosschain interface...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Crosschain Operations</h3>
          <p className="text-sm text-muted-foreground">
            Loading crosschain wallet data...
          </p>
        </div>
        <div className="p-8 text-center">
          <LoadingSpinner />
          <p className="text-muted-foreground mt-2">Fetching wallets from Sepolia, Amoy, and Neon...</p>
        </div>
      </div>
    );
  }

  // Remove the early return for empty wallets - show tabs always

  return (
    <div className="bg-card rounded-xl border">
      {/* Header with Portfolio Summary */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold">Crosschain Operations</h3>
            <p className="text-sm text-muted-foreground">
              USDC management across multiple networks
            </p>
          </div>
          
          <div className="text-right">
            <p className="text-sm font-medium">${getTotalPortfolioValue().toFixed(2)} USDC</p>
            <p className="text-xs text-muted-foreground">
              {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} • {getActiveChains().length} network{getActiveChains().length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        {/* Active Networks */}
        <div className="flex gap-2">
          {getActiveChains().map(chain => (
            <Badge 
              key={chain} 
              variant={chain === selectedChain ? "default" : "secondary"}
              className="capitalize"
            >
              {chain}
            </Badge>
          ))}
        </div>
      </div>

      {/* Current Wallet Info */}
      {selectedWallet && (
        <div className="p-4 bg-muted/30 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">{selectedWallet.wallet_name}</h4>
              <p className="text-sm text-muted-foreground">
                {selectedWallet.chains.length} chain{selectedWallet.chains.length !== 1 ? 's' : ''} connected
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono">${selectedWallet.total_value_usd.toFixed(2)} USDC</p>
              <p className="text-xs text-muted-foreground">Portfolio Value</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4">
        <Tabs defaultValue="bridge" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bridge">
              Bridge USDC
            </TabsTrigger>
            <TabsTrigger value="wallets">
              Wallets ({wallets.length})
            </TabsTrigger>
            <TabsTrigger value="chains">
              Networks
            </TabsTrigger>
            <TabsTrigger value="history">
              History
            </TabsTrigger>
          </TabsList>

          {/* Bridge/Transfer Operations */}
          <TabsContent value="bridge" className="space-y-6">
            <div className="space-y-2">
              <h4 className="font-medium">Crosschain Bridge & Transfer</h4>
              <p className="text-sm text-muted-foreground">
                Send USDC within networks or bridge between Sepolia ↔ Amoy ↔ Neon
              </p>
            </div>
            
            {wallets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="text-4xl mb-4">🔗</div>
                <h4 className="font-medium">No Wallets Available</h4>
                <p className="text-sm">Create a crosschain wallet first to start bridging USDC</p>
                <div className="flex gap-2 justify-center mt-4">
                  <Badge variant="outline">Sepolia</Badge>
                  <Badge variant="outline">Amoy</Badge>
                  <Badge variant="outline">Neon</Badge>
                </div>
              </div>
            ) : (
              <TransactionForm 
                wallets={wallets}
                selectedWallet={selectedWallet}
                selectedChain={selectedChain}
                onChainChange={setSelectedChain}
              />
            )}
          </TabsContent>

          {/* Wallet Management */}
          <TabsContent value="wallets" className="space-y-6">
            <div className="space-y-2">
              <h4 className="font-medium">Crosschain Wallet Management</h4>
              <p className="text-sm text-muted-foreground">
                Create and manage wallets for crosschain USDC operations
              </p>
            </div>
            
            <WalletControls 
              wallets={wallets}
              onWalletsUpdate={onWalletsUpdate}
              selectedWallet={selectedWallet}
              onWalletSelect={handleWalletSelect}
            />
          </TabsContent>

          {/* Network/Chain Management */}
          <TabsContent value="chains" className="space-y-6">
            <div className="space-y-2">
              <h4 className="font-medium">Network Management</h4>
              <p className="text-sm text-muted-foreground">
                Add and manage addresses across Sepolia, Amoy, and Neon networks
              </p>
            </div>
            
            {wallets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="text-4xl mb-4">🌐</div>
                <h4 className="font-medium">No Wallets to Manage</h4>
                <p className="text-sm">Create a wallet first to add network addresses</p>
              </div>
            ) : (
              <ChainSelector
                selectedWallet={selectedWallet}
                selectedChain={selectedChain}
                onChainChange={setSelectedChain}
                onWalletsUpdate={onWalletsUpdate}
              />
            )}
          </TabsContent>

          {/* Transaction History */}
          <TabsContent value="history" className="space-y-6">
            <div className="space-y-2">
              <h4 className="font-medium">Crosschain Transaction History</h4>
              <p className="text-sm text-muted-foreground">
                View your bridge transactions and transfers across networks
              </p>
            </div>
            
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-4">📊</div>
              <p className="font-medium">Transaction History Coming Soon</p>
              <p className="text-sm">Track your crosschain bridges and transfers</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}