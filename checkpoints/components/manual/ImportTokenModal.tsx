//Path: components/manual/ImportTokenModal.tsx

'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSDK } from '@/hooks/useSDK';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ImportTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenImported: () => void;
  selectedWallet: {
    bw_id: number;
    wallet_name: string;
  } | null;
}

interface ChainOption {
  id: string;
  name: string;
  icon: string;
  testnet: boolean;
}

const supportedChains: ChainOption[] = [
  {
    id: 'sepolia',
    name: 'Sepolia Testnet',
    icon: '🔷',
    testnet: true
  },
  {
    id: 'amoy', 
    name: 'Polygon Amoy',
    icon: '🟣',
    testnet: true
  },
  {
    id: 'neon',
    name: 'Neon EVM',
    icon: '🟢', 
    testnet: true
  }
];

export function ImportTokenModal({ isOpen, onClose, onTokenImported, selectedWallet }: ImportTokenModalProps) {
  const { user } = useAuth();
  const { sdk, canMakeRequests } = useSDK();
  
  const [selectedChain, setSelectedChain] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<any | null>(null);

  // Validation
  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const validateForm = (): string | null => {
    if (!selectedChain) {
      return 'Please select a blockchain';
    }
    
    if (!tokenAddress.trim()) {
      return 'Please enter a token contract address';
    }
    
    if (!isValidAddress(tokenAddress.trim())) {
      return 'Please enter a valid Ethereum address (0x...)';
    }
    
    return null;
  };

  const handleImport = async () => {
    if (!canMakeRequests || !user?.user_id) return;
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsImporting(true);
      setError(null);
      setImportResult(null);

      console.log('=== IMPORT TOKEN WITH USER_ID ===');
      console.log('Chain:', selectedChain);
      console.log('Token Address:', tokenAddress.trim());
      console.log('User ID:', user.user_id);
      console.log('===============================');

      // FIXED: Include user_id in request body since backend expects it
      const userId = typeof user.user_id === 'string' ? parseInt(user.user_id) : user.user_id;
      
      const response = await sdk.cryptoWallet.tokens.import({
        chain_id: selectedChain,
        asset_issuer: tokenAddress.trim(),
        user_id: userId  // FIXED: Add user_id to request body
      });

      console.log('Import response:', response);

      if (!response?.success) {
        const errorMessage = response?.error?.message || 
                           response?.message || 
                           'Failed to import token';
        throw new Error(errorMessage);
      }

      // SUCCESS: Store result to show success details
      setImportResult(response.data);
      console.log('Token imported successfully:', response.data);
      
      // Show success message with details
      const { token_info, imported_to_wallets, wallet_details } = response.data;
      
      let successMessage = `Successfully imported ${token_info.symbol} (${token_info.name}) to ${imported_to_wallets} wallet(s) on ${selectedChain} chain.`;
      
      if (wallet_details && wallet_details.length > 0) {
        const walletNames = wallet_details.map((w: any) => w.wallet_name).join(', ');
        successMessage += `\n\nWallets updated: ${walletNames}`;
      }

      console.log('Success message:', successMessage);
      
      // Notify parent component to refresh
      onTokenImported();
      
      // Auto-close after showing success
      setTimeout(() => {
        handleClose();
      }, 3000);
      
    } catch (error: any) {
      console.error('Failed to import token:', error);
      setImportResult(null);
      
      // Enhanced error handling for backend error codes
      let errorMessage = error.message || 'Failed to import token';
      
      if (error.message?.includes('already imported') || error.message?.includes('TOKEN_ALREADY_EXISTS')) {
        errorMessage = 'This token is already imported to your wallets on this chain';
      } else if (error.message?.includes('Invalid token') || error.message?.includes('INVALID_TOKEN_ADDRESS')) {
        errorMessage = 'Invalid token contract address. Please verify the address and try again.';
      } else if (error.message?.includes('Unsupported chain') || error.message?.includes('UNSUPPORTED_CHAIN')) {
        errorMessage = `Chain ${selectedChain} is not supported`;
      } else if (error.message?.includes('No wallets found') || error.message?.includes('NO_WALLETS_ON_CHAIN')) {
        errorMessage = `No wallets found with ${selectedChain} addresses. Please add a ${selectedChain} address to your wallet first.`;
      } else if (error.message?.includes('MISSING_USER_ID')) {
        errorMessage = 'User authentication failed. Please refresh and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (isImporting) return; // Prevent closing while importing
    setSelectedChain('');
    setTokenAddress('');
    setError(null);
    setImportResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Import Token</span>
            {isImporting && <LoadingSpinner size="sm" />}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Success Result */}
          {importResult && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                    Token Imported Successfully!
                  </h4>
                  <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                    <p><strong>{importResult.token_info?.symbol}</strong> ({importResult.token_info?.name})</p>
                    <p>Imported to <strong>{importResult.imported_to_wallets} wallet(s)</strong> on {importResult.chain_id}</p>
                    {importResult.wallet_details && (
                      <div className="mt-2 text-xs">
                        <p className="font-medium">Affected wallets:</p>
                        {importResult.wallet_details.map((wallet: any, index: number) => (
                          <p key={index}>• {wallet.wallet_name}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
              Import a token to all your wallets that have addresses on the selected blockchain. 
              The token will be monitored and balances will appear in your wallet.
            </p>
          </div>

          {/* Context Info */}
          {selectedWallet && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Import context:</p>
              <p className="text-sm text-muted-foreground">
                Will import to all your wallets with {selectedChain || 'selected chain'} addresses
              </p>
            </div>
          )}

          {/* Blockchain Selection */}
          <div className="space-y-2">
            <Label htmlFor="blockchain">
              Blockchain <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={selectedChain} 
              onValueChange={(value) => {
                setSelectedChain(value);
                setError(null);
                setImportResult(null);
              }}
              disabled={isImporting}
            >
              <SelectTrigger id="blockchain">
                <SelectValue placeholder="Select blockchain" />
              </SelectTrigger>
              <SelectContent>
                {supportedChains.map((chain) => (
                  <SelectItem key={chain.id} value={chain.id}>
                    <div className="flex items-center gap-2">
                      <span>{chain.icon}</span>
                      <span>{chain.name}</span>
                      {chain.testnet && (
                        <span className="text-xs text-muted-foreground">Testnet</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && !selectedChain && (
              <p className="text-sm text-red-500">Blockchain is required</p>
            )}
          </div>

          {/* Token Address Input */}
          <div className="space-y-2">
            <Label htmlFor="tokenAddress">
              Token Contract Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="tokenAddress"
              placeholder="0x..."
              value={tokenAddress}
              onChange={(e) => {
                setTokenAddress(e.target.value.trim());
                setError(null);
                setImportResult(null);
              }}
              disabled={isImporting}
              className={`font-mono text-sm ${error && !isValidAddress(tokenAddress.trim()) ? 'border-red-500' : ''}`}
            />
            <p className="text-xs text-muted-foreground">
              Enter the smart contract address of the token (e.g., USDC, USDT, DAI)
            </p>
            {error && tokenAddress && !isValidAddress(tokenAddress.trim()) && (
              <p className="text-sm text-red-500">Please enter a valid contract address</p>
            )}
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-800 dark:text-orange-200">
              Only import tokens from trusted sources. Verify the contract address on the blockchain explorer before importing.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!selectedChain || !tokenAddress.trim() || !isValidAddress(tokenAddress.trim()) || isImporting}
              className="min-w-[100px]"
            >
              {isImporting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Importing...</span>
                </>
              ) : (
                'Import Token'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}