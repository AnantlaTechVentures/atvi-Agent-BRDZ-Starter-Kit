//Path: components/transactions/CrosschainTransactions.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSDK } from '@/hooks/useSDK';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Repeat, Wallet, ArrowDownUp } from 'lucide-react';

// Import komponen modular
import ChainSelector from './crosschain/ChainSelector';
import TokenAmountInput from './crosschain/TokenAmountInput';
import FromAddressInput from './crosschain/FromAddressInput';
import DestinationAddressInput from './crosschain/DestinationAddressInput';
import CrosschainSteps from './crosschain/CrosschainSteps';
import CrosschainResult from './crosschain/CrosschainResult';

// Type Definitions untuk SDK Response
interface SDKResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  message?: string;
}

interface WalletData {
  id: number;
  bw_id: number;
  wallet_name: string;
  addresses?: any[];
}

interface TokenData {
  symbol: string;
  balance: string;
  contract_address: string;
  name: string;
  decimals?: number;
}

interface CrosschainResult {
  success: boolean;
  log_id?: string;
  nonce?: string;
  tx_hash?: string;
  error?: string;
  amount?: string;
  token?: string;
  from_chain?: string;
  to_chain?: string;
  status?: string;
}

interface CrosschainStep {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

// SDK Response Interfaces
interface InitiateTransferResponse {
  log_id: string;
  nonce: string;
  status: string;
  burn_tx_hash?: string;
}

interface PrivateKeyResponse {
  private_key: string;
  wallet_id: number;
  chain_id: string;
}

interface BurnTokenResponse {
  tx_hash: string;
  log_id: string;
  nonce: string;
  status: string;
}

const supportedChains = [
  { id: 'sepolia', name: 'Sepolia Testnet', icon: '🔷' },
  { id: 'amoy', name: 'Polygon Amoy', icon: '🟣' },
  { id: 'neon', name: 'Neon EVM', icon: '🟢' }
];

export default function CrosschainTransactions() {
  const { user } = useAuth();
  const { sdk, canMakeRequests } = useSDK();
  
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [fromChain, setFromChain] = useState<string>('');
  const [toChain, setToChain] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Token and balance states
  const [fromChainTokens, setFromChainTokens] = useState<TokenData[]>([]);
  const [currentFromAddress, setCurrentFromAddress] = useState<string>('');
  const [selectedToken] = useState<string>('USDC'); // Fixed ke USDC untuk crosschain
  
  const [transactionResult, setTransactionResult] = useState<CrosschainResult | null>(null);
  const [crosschainSteps, setCrosschainSteps] = useState<CrosschainStep[]>([
    { id: 1, name: 'Initiate', description: 'Create transfer log', status: 'pending' },
    { id: 2, name: 'Burn', description: 'Burn tokens on source chain', status: 'pending' },
    { id: 3, name: 'Confirm', description: 'Confirm burn transaction', status: 'pending' },
    { id: 4, name: 'Mint', description: 'Mint tokens on destination chain', status: 'pending' }
  ]);

  useEffect(() => {
    loadWallets();
  }, [canMakeRequests]);

  useEffect(() => {
    if (selectedWallet && fromChain) {
      loadFromChainTokens();
    }
  }, [selectedWallet, fromChain]);

  // Reset saat wallet berubah
  useEffect(() => {
    if (selectedWallet) {
      setFromChain('');
      setToChain('');
      setFromChainTokens([]);
      setCurrentFromAddress('');
      resetSteps();
    }
  }, [selectedWallet]);

  // Filter chains berdasarkan wallet addresses
  const availableFromChains = useMemo(() => {
    if (!selectedWallet) return [];
    
    const selectedWalletData = wallets.find(w => w.bw_id.toString() === selectedWallet);
    if (!selectedWalletData?.addresses) return [];
    
    return selectedWalletData.addresses
      .filter(addr => supportedChains.some(chain => chain.id === addr.chain_id))
      .map(addr => addr.chain_id);
  }, [selectedWallet, wallets]);

  const availableToChains = useMemo(() => {
    if (!selectedWallet) return [];
    
    const selectedWalletData = wallets.find(w => w.bw_id.toString() === selectedWallet);
    if (!selectedWalletData?.addresses) return [];
    
    return selectedWalletData.addresses
      .filter(addr => 
        supportedChains.some(chain => chain.id === addr.chain_id) && 
        addr.chain_id !== fromChain
      )
      .map(addr => addr.chain_id);
  }, [selectedWallet, wallets, fromChain]);

  const loadWallets = async () => {
    if (!canMakeRequests || !user?.user_id) return;

    try {
      const userId = typeof user.user_id === 'string' ? parseInt(user.user_id) : user.user_id;
      const response = await sdk.cryptoWallet.getUserWallets(userId) as SDKResponse<{ wallets: any[] }>;
      
      if (response?.success && response?.data?.wallets) {
        const walletsWithAddresses = await Promise.all(
          response.data.wallets.map(async (wallet: any) => {
            try {
              const addressResponse = await sdk.cryptoWallet.getWalletAddresses(wallet.bw_id) as SDKResponse<{ addresses: any[] }>;
              return {
                ...wallet,
                addresses: addressResponse?.success ? addressResponse.data?.addresses || [] : []
              };
            } catch (error) {
              return { ...wallet, addresses: [] };
            }
          })
        );
        
        setWallets(walletsWithAddresses);
      }
    } catch (error) {
      console.error('Failed to load wallets:', error);
    }
  };

  const loadFromChainTokens = async () => {
    if (!selectedWallet || !fromChain || !canMakeRequests) return;

    try {
      const walletId = parseInt(selectedWallet);
      const balanceResponse = await sdk.cryptoWallet.balance.getChain(walletId, fromChain) as SDKResponse<{ tokens: any[] }>;
      
      if (balanceResponse?.success && balanceResponse?.data) {
        const tokens: TokenData[] = [];
        
        if (balanceResponse.data.tokens && Array.isArray(balanceResponse.data.tokens)) {
          const tokensWithDecimals = balanceResponse.data.tokens.map((token: any) => ({
            ...token,
            decimals: token.decimals || (token.symbol === 'USDC' ? 6 : 18)
          }));
          tokens.push(...tokensWithDecimals);
        }
        
        setFromChainTokens(tokens);
        
        // Get wallet address for from chain
        const selectedWalletData = wallets.find(w => w.bw_id.toString() === selectedWallet);
        const chainAddress = selectedWalletData?.addresses?.find(addr => addr.chain_id === fromChain);
        if (chainAddress) {
          setCurrentFromAddress(chainAddress.wallet_address);
        }
      }
    } catch (error) {
      console.error('Failed to load from chain tokens:', error);
    }
  };

  const resetSteps = () => {
    setCrosschainSteps(prev => prev.map(step => ({ 
      ...step, 
      status: 'pending' as const, 
      error: undefined 
    })));
  };

  const updateStepStatus = (stepId: number, status: CrosschainStep['status'], error?: string) => {
    setCrosschainSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, error: error || undefined }
        : step
    ));
  };

  // Add chain normalization function for backend
  const normalizeChainForBackend = (chainId: string): string => {
    const chainMap: Record<string, string> = {
      'sepolia': 'Sepolia',
      'amoy': 'Amoy', 
      'neon': 'Neon'
    };
    return chainMap[chainId.toLowerCase()] || chainId;
  };

  const executeCrosschainTransfer = async () => {
    if (!fromChain || !toChain || !amount || !recipientAddress) {
      throw new Error('Missing required transfer data');
    }

    resetSteps();

    let transferData: any = {
      user_id: user?.user_id,
      amount: parseFloat(amount),
      from_chain: normalizeChainForBackend(fromChain),
      to_chain: normalizeChainForBackend(toChain),
      token: selectedToken,
      recipient_address: recipientAddress,
      return_address: currentFromAddress
    };

    console.log('🔍 Sending normalized transfer data:', transferData);

    let logId: string = '';
    let nonce: string = '';
    let burnTxHash: string = '';

    // Step 1: Initiate Transfer
    updateStepStatus(1, 'processing');
    try {
      const response = await sdk.crosschain.initiateTransfer(transferData) as any;
      if (!response?.success) {
        throw new Error(response?.error?.message || 'Failed to initiate transfer');
      }
      logId = response.log_id;
      nonce = response.nonce;
      updateStepStatus(1, 'completed');
    } catch (error: any) {
      updateStepStatus(1, 'failed', error.message);
      throw error;
    }

    // Step 2: Burn Token menggunakan private key dari frontend wallet
    updateStepStatus(2, 'processing');
    try {
      // Get private key dari crypto wallet untuk signing
      const privateKeyResponse = await sdk.cryptoWallet.keys.getForSigning(
        parseInt(selectedWallet),
        fromChain,
        'signing'
      ) as SDKResponse<PrivateKeyResponse>;
      
      if (!privateKeyResponse?.success || !privateKeyResponse?.data?.private_key) {
        throw new Error('Failed to get private key for signing');
      }

      // Execute burn token
      const response = await sdk.crosschain.burnTokenFrontend({
        log_id: logId,
        nonce: nonce,
        private_key: privateKeyResponse.data.private_key
      }) as any;
      
      if (!response?.success) {
        throw new Error(response?.error?.message || 'Failed to burn token');
      }
      
      // Fix response parsing - handle different response structures
      burnTxHash = response.data?.tx_hash || response.tx_hash;
      if (!burnTxHash) {
        throw new Error('No transaction hash returned from burn operation');
      }
      
      updateStepStatus(2, 'completed');
    } catch (error: any) {
      updateStepStatus(2, 'failed', error.message);
      throw error;
    }

    // Step 3: Confirm Transfer
    updateStepStatus(3, 'processing');
    try {
      const response = await sdk.crosschain.confirmTransfer({
        log_id: logId,
        tx_hash: burnTxHash,
        status: 'burned'
      }) as SDKResponse;
      
      if (!response?.success) {
        throw new Error(response?.error?.message || 'Failed to confirm transfer');
      }
      
      updateStepStatus(3, 'completed');
    } catch (error: any) {
      updateStepStatus(3, 'failed', error.message);
      throw error;
    }

    // Step 4: Mint Token
    updateStepStatus(4, 'processing');
    try {
      const response = await sdk.crosschain.mintToken(nonce) as SDKResponse<{ tx_hash: string }>;
      
      if (!response?.success) {
        throw new Error(response?.error?.message || 'Failed to mint token');
      }
      
      // FIXED: Only access response.data.tx_hash for typed response
      const mintTxHash = response.data?.tx_hash;
      if (!mintTxHash) {
        throw new Error('No mint transaction hash returned');
      }
      
      updateStepStatus(4, 'completed');
      
      return {
        log_id: logId,
        nonce: nonce,
        burn_tx_hash: burnTxHash,
        mint_tx_hash: mintTxHash,
        status: 'completed'
      };
    } catch (error: any) {
      updateStepStatus(4, 'failed', error.message);
      throw error;
    }
  };

  const handleSubmitCrosschainTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedWallet || !fromChain || !toChain || !amount || !recipientAddress) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (fromChain === toChain) {
      alert('Source and destination chains must be different');
      return;
    }
    
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      alert('Invalid amount');
      return;
    }

    // Check balance
    const fromTokenInfo = fromChainTokens.find(token => token.symbol === selectedToken);
    if (fromTokenInfo && transferAmount > parseFloat(fromTokenInfo.balance)) {
      alert('Insufficient balance');
      return;
    }
    
    setIsLoading(true);
    setTransactionResult(null);
    
    try {
      const result = await executeCrosschainTransfer();
      
      setTransactionResult({
        success: true,
        log_id: result.log_id,
        nonce: result.nonce,
        tx_hash: result.mint_tx_hash,
        amount: amount,
        token: selectedToken,
        from_chain: fromChain,
        to_chain: toChain,
        status: 'completed'
      });
      
      // Clear form
      setRecipientAddress('');
      setAmount('');
      
      // Reload balances
      await loadFromChainTokens();
      
    } catch (error: any) {
      console.error('Crosschain transfer failed:', error);
      setTransactionResult({
        success: false,
        error: error.message || 'Crosschain transfer failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwapChains = () => {
    const tempFrom = fromChain;
    setFromChain(toChain);
    setToChain(tempFrom);
  };

  const selectedWalletInfo = wallets.find(w => w.bw_id.toString() === selectedWallet);
  const selectedFromTokenInfo = fromChainTokens.find(token => token.symbol === selectedToken);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Transfer Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Crosschain Bridge
          </CardTitle>
          <CardDescription>
            Transfer USDC tokens between blockchain networks using SDK
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmitCrosschainTransfer} className="space-y-4">
            {/* Wallet Selection */}
            <div className="space-y-2">
              <Label htmlFor="wallet">Wallet</Label>
              <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                <SelectTrigger>
                  <SelectValue placeholder="Select wallet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((wallet) => (
                    <SelectItem key={wallet.bw_id} value={wallet.bw_id.toString()}>
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        {wallet.wallet_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Chain Selection */}
            <div className="grid grid-cols-1 gap-4">
              <ChainSelector
                label="From Network"
                value={fromChain}
                onChange={setFromChain}
                availableChains={availableFromChains}
              />
              
              {/* Swap Button */}
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSwapChains}
                  disabled={!fromChain || !toChain}
                  className="px-3"
                >
                  <ArrowDownUp className="h-4 w-4" />
                </Button>
              </div>
              
              <ChainSelector
                label="To Network"
                value={toChain}
                onChange={setToChain}
                availableChains={availableToChains}
              />
            </div>
            
            {/* From Address Info */}
            <FromAddressInput
              value={currentFromAddress}
              onChange={() => {}} // Read-only dari wallet
              tokens={fromChainTokens}
              disabled={true}
            />
            
            {/* Amount Input */}
            <TokenAmountInput
              value={amount}
              onChange={setAmount}
              balance={selectedFromTokenInfo?.balance}
              token={selectedToken}
            />
            
            {/* Destination Address */}
            <DestinationAddressInput
              value={recipientAddress}
              onChange={setRecipientAddress}
              toChain={toChain}
            />
            
            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full"
              disabled={
                isLoading || 
                !selectedWallet || 
                !fromChain || 
                !toChain || 
                !amount || 
                !recipientAddress ||
                fromChain === toChain
              }
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Processing Bridge...
                </>
              ) : (
                <>
                  <Repeat className="h-4 w-4 mr-2" />
                  Bridge {selectedToken}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Right Panel */}
      <div className="space-y-6">
        {/* Progress Steps */}
        <CrosschainSteps 
          steps={crosschainSteps} 
          isVisible={isLoading}
        />

        {/* Transaction Result */}
        <CrosschainResult 
          result={transactionResult} 
          isVisible={!!transactionResult}
        />
        
        {/* Bridge Summary */}
        {selectedWalletInfo && fromChain && toChain && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bridge Summary</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Wallet:</span>
                <span className="font-medium">{selectedWalletInfo.wallet_name}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Token:</span>
                <span className="font-medium">{selectedToken}</span>
              </div>
              
              {selectedFromTokenInfo && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Available Balance:</span>
                  <span className="font-medium">
                    {parseFloat(selectedFromTokenInfo.balance).toFixed(6)} {selectedToken}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t text-xs text-muted-foreground">
                <p>• Bridge fee: ~0.3% of transfer amount</p>
                <p>• Estimated time: 5-15 minutes</p>
                <p>• Uses frontend wallet for secure signing</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}