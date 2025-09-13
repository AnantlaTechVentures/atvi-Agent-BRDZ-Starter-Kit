//Path: components/manual/CreateWalletModal.tsx

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSDK } from '@/hooks/useSDK';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletCreated: () => void;
}

interface BlockchainOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

const blockchainOptions: BlockchainOption[] = [
  {
    id: 'sepolia',
    name: 'Sepolia Testnet',
    icon: '🔷',
    description: 'Ethereum testnet for development',
    color: 'bg-blue-100 border-blue-300 text-blue-700'
  },
  {
    id: 'amoy',
    name: 'Polygon Amoy',
    icon: '🟣',
    description: 'Polygon testnet for development',
    color: 'bg-purple-100 border-purple-300 text-purple-700'
  },
  {
    id: 'neon',
    name: 'Neon EVM',
    icon: '🟢',
    description: 'Solana-compatible EVM',
    color: 'bg-green-100 border-green-300 text-green-700'
  }
];

export function CreateWalletModal({ isOpen, onClose, onWalletCreated }: CreateWalletModalProps) {
  const { user } = useAuth();
  const { sdk, canMakeRequests } = useSDK();
  
  
  
  const [walletName, setWalletName] = useState('');
  const [selectedBlockchains, setSelectedBlockchains] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{ 
    chainMnemonics: Array<{
      chainId: string;
      chainName: string; 
      mnemonic: string;
      address: string;
    }>; 
    walletName: string 
  } | null>(null);

  const filteredBlockchains = blockchainOptions.filter(blockchain =>
    blockchain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    blockchain.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleBlockchain = (blockchainId: string) => {
    setSelectedBlockchains(prev => 
      prev.includes(blockchainId)
        ? prev.filter(id => id !== blockchainId)
        : [...prev, blockchainId]
    );
  };

  const handleCreateWallet = async () => {
    // Clear previous errors
    setError(null);
    
    if (!canMakeRequests) {
      setError('SDK is not ready. Please wait a moment and try again.');
      return;
    }
    
    if (!user?.user_id) {
      setError('User not authenticated. Please log in again.');
      return;
    }
    
    if (!walletName.trim()) {
      setError('Please enter a wallet name');
      return;
    }

    if (selectedBlockchains.length === 0) {
      setError('Please select at least one blockchain');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const userId = typeof user.user_id === 'string' ? parseInt(user.user_id) : user.user_id;

      // Step 1: Create the wallet
      const primaryChainId = selectedBlockchains[0]; // ← TAMBAH INI

      const createResponse = await sdk.cryptoWallet.createWallet({
        wallet_name: walletName.trim(),
        user_id: userId,
        chain_id: primaryChainId  // ← TAMBAH INI
      });

      // Fix: Handle backend response structure
      if (!createResponse?.success) {
        const errorMessage = createResponse?.error?.message || 
                           createResponse?.message || 
                           'Failed to create wallet';
        throw new Error(errorMessage);
      }

      // Backend returns data object with bw_id
      const walletData = createResponse.data;
      const bwId = walletData?.bw_id;

      if (!bwId) {
        throw new Error('Wallet created but no ID returned');
      }

      // Step 2: Add selected blockchains if any
      const chainResults = [];
      if (selectedBlockchains.length > 0) {
       
        for (const chainId of selectedBlockchains) {
          try {         
            const chainResponse = await sdk.cryptoWallet.addChainAddress(bwId, { 
              chain_id: chainId 
            });        

            if (chainResponse?.success) {
              chainResults.push({
                chain: chainId,
                success: true,
                address: chainResponse.data?.wallet_address,
                mnemonic: chainResponse.data?.mnemonic
              });

            } else {
              chainResults.push({
                chain: chainId,
                success: false,
                error: chainResponse?.error?.message || 'Unknown error'
              });
      
            }
          } catch (chainError: any) {

            chainResults.push({
              chain: chainId,
              success: false,
              error: chainError.message || 'Network error'
            });
          }
        }
      }

      // Show results summary
      const successfulChains = chainResults.filter(r => r.success);
      const failedChains = chainResults.filter(r => !r.success);
      
      console.log('Chain addition summary:', {
        successful: successfulChains.length,
        failed: failedChains.length,
        results: chainResults
      });

      if (failedChains.length > 0) {
        const failedChainNames = failedChains.map(r => r.chain).join(', ');
        console.warn(`Some chains failed to add: ${failedChainNames}`);
        // Still continue - wallet was created successfully
      }

      // Show mnemonic backup reminder if any chains were added
      if (successfulChains.length > 0) {
        const chainMnemonics = successfulChains.map(chain => ({
          chainId: chain.chain,
          chainName: blockchainOptions.find(b => b.id === chain.chain)?.name || chain.chain,
          mnemonic: chain.mnemonic,
          address: chain.address
        })).filter(item => item.mnemonic);
        
        if (chainMnemonics.length > 0) {
          setSuccessData({ 
            chainMnemonics, 
            walletName: walletName.trim() 
          });
          setShowSuccessModal(true);
          return; // Don't close modal yet, show success modal first
        }
      }

      // Success - refresh wallet list
      onWalletCreated();
      handleClose();
      
    } catch (error: any) {
      
      // Enhanced error handling
      let errorMessage = 'Failed to create wallet';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (isCreating) return; // Prevent closing while creating
    setWalletName('');
    setSelectedBlockchains([]);
    setSearchQuery('');
    setError(null);
    onClose();
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
    onWalletCreated();
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Add New Wallet</span>
            {isCreating && <LoadingSpinner size="sm" />}

          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Wallet Name */}
          <div className="space-y-2">
            <Label htmlFor="walletName">
              Wallet Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="walletName"
              placeholder="My Wallet"
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              disabled={isCreating}
              className={error && !walletName.trim() ? 'border-red-500' : ''}
            />
            {error && !walletName.trim() && (
              <p className="text-sm text-red-500">Wallet name is required</p>
            )}
          </div>

          {/* Description */}
          <div className="text-sm text-muted-foreground">
            Name this new wallet and add one or more blockchains in order to create an address for each 
            blockchain added. Additional blockchains can be added to the wallet later.
          </div>

          {/* Blockchain Selection */}
          <div className="space-y-4">
            <Label>Add blockchains to wallet</Label>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Find a Blockchain"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                disabled={isCreating}
              />
            </div>

            {/* Blockchain Grid */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">Testnets</div>
              <div className="grid grid-cols-2 gap-3">
                {filteredBlockchains.map((blockchain) => (
                  <div
                    key={blockchain.id}
                    className={`
                      relative p-4 border rounded-lg cursor-pointer transition-all hover:shadow-sm
                      ${selectedBlockchains.includes(blockchain.id) 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                        : 'border-gray-200 hover:border-gray-300'
                      }
                      ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    onClick={() => !isCreating && toggleBlockchain(blockchain.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{blockchain.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-sm">{blockchain.name}</h3>
                          {selectedBlockchains.includes(blockchain.id) && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {blockchain.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Count */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{selectedBlockchains.length} Selected</span>
              {selectedBlockchains.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {selectedBlockchains.map((chainId) => {
                    const chain = blockchainOptions.find(b => b.id === chainId);
                    return chain ? (
                      <Badge key={chainId} variant="secondary" className="text-xs">
                        {chain.icon} {chain.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateWallet}
              disabled={!walletName.trim() || selectedBlockchains.length === 0 || isCreating || !canMakeRequests || !user?.user_id}
              className="min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              title={!walletName.trim() ? 'Please enter a wallet name' : selectedBlockchains.length === 0 ? 'Please select at least one blockchain' : !canMakeRequests ? 'SDK not ready' : !user?.user_id ? 'User not authenticated' : 'Create new wallet'}
            >
              {isCreating ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Creating...</span>
                </>
              ) : !canMakeRequests ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">SDK Loading...</span>
                </>
              ) : !user?.user_id ? (
                'Not Authenticated'
              ) : !walletName.trim() ? (
                'Enter Wallet Name'
              ) : selectedBlockchains.length === 0 ? (
                'Select Blockchains'
              ) : (
                'Create Wallet'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={() => setShowSuccessModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              Wallet Created Successfully!
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Your wallet <span className="font-semibold text-foreground">{successData?.walletName}</span> has been created successfully!
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-800 mb-2">IMPORTANT: Backup Your Mnemonic Phrase</h4>
                    <p className="text-sm text-amber-700 mb-3">
                      This phrase is the key to your wallet. Write it down and keep it safe - it will not be shown again!
                    </p>
                    
                    <div className="space-y-3">
                      {successData?.chainMnemonics.map((chain, index) => (
                        <div key={chain.chainId} className="bg-white border border-amber-300 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-amber-800">
                              {blockchainOptions.find(b => b.id === chain.chainId)?.icon} {chain.chainName}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {chain.address?.slice(0,6)}...{chain.address?.slice(-4)}
                            </Badge>
                          </div>
                          <p className="text-xs font-mono text-amber-800 leading-relaxed break-words bg-amber-50 p-2 rounded">
                            {chain.mnemonic}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                ⚠️ Never share this phrase with anyone. Store it securely offline.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={handleSuccessClose}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              I've Backed Up My Phrase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}