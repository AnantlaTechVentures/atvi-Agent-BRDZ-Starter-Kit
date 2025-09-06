//Path: components/transactions/OnchainTransactions.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { useAuth } from '@/contexts/AuthContext';
import { useSDK } from '@/hooks/useSDK';
import { useWallet } from '@/components/providers/WalletProvider';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Send, 
  Wallet, 
  Copy,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock,
  Calculator,
  Info
} from 'lucide-react';

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

interface PlatformFeeSettings {
  platform_fee_percentage: number;
  minimum_platform_fee_usd: number;
  gas_price_multiplier: number;
}

interface TransactionResult {
  success: boolean;
  tx_hash?: string;
  error?: string;
  amount?: string;
  token?: string;
  to_address?: string;
  chain?: string;
  gas_fee?: string;
  platform_fee?: string;
}

const supportedChains = [
  { 
    id: 'sepolia', 
    name: 'Sepolia Testnet', 
    icon: '🔷', 
    symbol: 'ETH',
    rpc: process.env.NEXT_PUBLIC_SEPOLIA_RPC
  },
  { 
    id: 'amoy', 
    name: 'Polygon Amoy', 
    icon: '🟣', 
    symbol: 'POL',
    rpc: process.env.NEXT_PUBLIC_AMOY_RPC
  },
  { 
    id: 'neon', 
    name: 'Neon EVM', 
    icon: '🟢', 
    symbol: 'NEON',
    rpc: process.env.NEXT_PUBLIC_NEON_RPC
  }
];

const USDC_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

export default function OnchainTransactions() {
  const { user } = useAuth();
  const { sdk, canMakeRequests } = useSDK();
  const { signer, walletAddress } = useWallet();
  
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [selectedChain, setSelectedChain] = useState<string>('');
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFee, setIsLoadingFee] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<TokenData[]>([]);
  const [platformFeeSettings, setPlatformFeeSettings] = useState<PlatformFeeSettings | null>(null);
  const [gasEstimate, setGasEstimate] = useState<string>('0');
  const [platformFeeEstimate, setPlatformFeeEstimate] = useState<string>('0');
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null);
  const [currentWalletAddress, setCurrentWalletAddress] = useState<string>('');

  useEffect(() => {
    loadWallets();
    loadPlatformFeeSettings();
  }, [canMakeRequests]);

  useEffect(() => {
    if (selectedWallet && selectedChain) {
      loadChainTokens();
    }
  }, [selectedWallet, selectedChain]);

  // Reset chain and token when wallet changes
  useEffect(() => {
    if (selectedWallet) {
      setSelectedChain(''); 
      setSelectedToken('');
      setAvailableTokens([]);
      setCurrentWalletAddress('');
    }
  }, [selectedWallet]);

  useEffect(() => {
    if (selectedWallet && selectedChain && selectedToken && amount && recipientAddress) {
      estimateTransactionFees();
    } else {
      setGasEstimate('0');
      setPlatformFeeEstimate('0');
    }
  }, [selectedWallet, selectedChain, selectedToken, amount, recipientAddress]);

  // Filter available chains based on wallet addresses
  const availableChains = useMemo(() => {
    if (!selectedWallet) return [];
    
    const selectedWalletData = wallets.find(w => w.bw_id.toString() === selectedWallet);
    if (!selectedWalletData?.addresses) return [];
    
    // Filter chains that have addresses
    return supportedChains.filter(chain => 
      selectedWalletData.addresses?.some(addr => addr.chain_id === chain.id)
    );
  }, [selectedWallet, wallets]);

  const loadWallets = async () => {
    if (!canMakeRequests || !user?.user_id) return;

    try {
      const userId = typeof user.user_id === 'string' ? parseInt(user.user_id) : user.user_id;
      const response = await sdk.cryptoWallet.getUserWallets(userId);
      
      if (response?.success && response?.data?.wallets) {
        const walletsWithAddresses = await Promise.all(
          response.data.wallets.map(async (wallet: any) => {
            try {
              const addressResponse = await sdk.cryptoWallet.getWalletAddresses(wallet.bw_id);
              return {
                ...wallet,
                addresses: addressResponse?.success ? addressResponse.data.addresses : []
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

  const loadPlatformFeeSettings = async () => {
    if (!canMakeRequests) return;

    try {
      const response = await sdk.onchain.getFeeSettings();
      if (response?.success && response?.data?.fee_settings) {
        setPlatformFeeSettings(response.data.fee_settings);
      }
    } catch (error) {
      console.error('Failed to load platform fee settings:', error);
    }
  };

  const loadChainTokens = async () => {
    if (!selectedWallet || !selectedChain || !canMakeRequests) return;

    try {
      const walletId = parseInt(selectedWallet);
      const balanceResponse = await sdk.cryptoWallet.balance.getChain(walletId, selectedChain);
      
      if (balanceResponse?.success && balanceResponse?.data) {
        const tokens: TokenData[] = [];
        
        // Add native token
        const chainInfo = supportedChains.find(chain => chain.id === selectedChain);
        if (chainInfo && balanceResponse.data.native_balance) {
          tokens.push({
            symbol: chainInfo.symbol,
            balance: balanceResponse.data.native_balance.balance || '0',
            contract_address: 'native',
            name: `${chainInfo.name} Native Token`,
            decimals: 18
          });
        }
        
        // Add imported tokens with decimals
        if (balanceResponse.data.tokens && Array.isArray(balanceResponse.data.tokens)) {
          const tokensWithDecimals = await Promise.all(
            balanceResponse.data.tokens.map(async (token: any) => ({
              ...token,
              decimals: token.decimals || (token.symbol === 'USDC' ? 6 : 18)
            }))
          );
          tokens.push(...tokensWithDecimals);
        }
        
        setAvailableTokens(tokens);
        
        // Get wallet address for selected chain
        const selectedWalletData = wallets.find(w => w.bw_id.toString() === selectedWallet);
        const chainAddress = selectedWalletData?.addresses?.find(addr => addr.chain_id === selectedChain);
        if (chainAddress) {
          setCurrentWalletAddress(chainAddress.wallet_address);
        }
        
        // Auto-select USDC if available
        const usdcToken = tokens.find(token => token.symbol === 'USDC');
        if (usdcToken && !selectedToken) {
          setSelectedToken('USDC');
        } else if (tokens.length > 0 && !selectedToken) {
          setSelectedToken(tokens[0].symbol);
        }
      }
    } catch (error) {
      console.error('Failed to load chain tokens:', error);
    }
  };

  const estimateTransactionFees = async () => {
    if (!selectedChain || !selectedToken || !amount || !recipientAddress || !platformFeeSettings || !signer) {
      return;
    }

    setIsLoadingFee(true);

    try {
      const chainInfo = supportedChains.find(chain => chain.id === selectedChain);
      const tokenInfo = availableTokens.find(token => token.symbol === selectedToken);
      
      if (!chainInfo || !tokenInfo) return;

      // Create provider for selected chain
      const provider = new ethers.JsonRpcProvider(chainInfo.rpc);
      const connectedSigner = signer.connect(provider);
      
      let gasEstimate: bigint;
      const transferAmount = ethers.parseUnits(amount, tokenInfo.decimals || 18);

      if (tokenInfo.contract_address === 'native') {
        // Native token transfer
        const tx = {
          to: recipientAddress,
          value: transferAmount,
          from: await connectedSigner.getAddress()
        };
        gasEstimate = await provider.estimateGas(tx);
      } else {
        // ERC20 token transfer
        const contract = new ethers.Contract(tokenInfo.contract_address, ERC20_ABI, connectedSigner);
        gasEstimate = await contract.transfer.estimateGas(recipientAddress, transferAmount);
      }

      // Get current gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
      
      // Apply gas price multiplier from platform settings
      const adjustedGasPrice = (gasPrice * BigInt(Math.round(platformFeeSettings.gas_price_multiplier * 100))) / BigInt(100);
      
      // Calculate gas fee in native token
      const gasCost = gasEstimate * adjustedGasPrice;
      const gasFeeFormatted = ethers.formatEther(gasCost);
      setGasEstimate(`${parseFloat(gasFeeFormatted).toFixed(6)} ${chainInfo.symbol}`);

      // Calculate platform fee
      const amountValue = parseFloat(amount);
      const calculatedPlatformFee = Math.max(
        (amountValue * platformFeeSettings.platform_fee_percentage) / 100,
        platformFeeSettings.minimum_platform_fee_usd
      );
      setPlatformFeeEstimate(`$${calculatedPlatformFee.toFixed(2)} USD`);

    } catch (error) {
      console.error('Failed to estimate fees:', error);
      setGasEstimate('Unable to estimate');
      setPlatformFeeEstimate('Unable to estimate');
    } finally {
      setIsLoadingFee(false);
    }
  };

  const executeTransaction = async () => {
    if (!selectedChain || !selectedToken || !amount || !recipientAddress || !currentWalletAddress) {
      throw new Error('Missing required transaction data');
    }

    const chainInfo = supportedChains.find(chain => chain.id === selectedChain);
    const tokenInfo = availableTokens.find(token => token.symbol === selectedToken);
    
    if (!chainInfo || !tokenInfo) {
      throw new Error('Invalid chain or token selection');
    }

    const response = await sdk.onchain.executeTransaction({
      user_id: user?.user_id,
      wallet_id: parseInt(selectedWallet),
      chain_id: selectedChain,
      token_symbol: selectedToken,
      token_contract: tokenInfo.contract_address,
      to_address: recipientAddress,
      amount: amount,
      decimals: tokenInfo.decimals || 18
    });

    if (response?.success) {
      return {
        hash: response.data.transaction.tx_hash,  // ✅ Fix path
        gasUsed: BigInt(response.data.transaction.gas_used || 0),  // ✅ Fix path
        gasPrice: BigInt(response.data.transaction.gas_price || 0),  // ✅ Fix path
        blockNumber: response.data.transaction.block_number  // ✅ Fix path
      };
    } else {
      throw new Error(response?.error?.message || 'Transaction failed');
    }
  };

  const handleSubmitTransfer = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!selectedWallet || !selectedChain || !selectedToken || !recipientAddress || !amount) {
    alert('Please fill in all required fields');
    return;
  }
  
  if (!validateAddress(recipientAddress)) {
    alert('Invalid recipient address format');
    return;
  }
  
  const transferAmount = parseFloat(amount);
  if (isNaN(transferAmount) || transferAmount <= 0) {
    alert('Invalid amount');
    return;
  }

  if (!currentWalletAddress) {
      alert('Wallet address not found for selected chain');
      return;
  }
  
  setIsLoading(true);
  setTransactionResult(null);
  
  try {
    // Execute blockchain transaction
    const txResult = await executeTransaction();
    
    setTransactionResult({
      success: true,
      tx_hash: txResult.hash,
      amount: amount,
      token: selectedToken,
      to_address: recipientAddress,
      chain: selectedChain,
      gas_fee: ethers.formatEther(txResult.gasUsed * txResult.gasPrice),
      platform_fee: platformFeeEstimate
    });
    
    // Clear form
    setRecipientAddress('');
    setAmount('');
    setSelectedToken('');
    
    // Reload balances
    await loadChainTokens();
    
  } catch (error: any) {
    console.error('Transfer failed:', error);
    setTransactionResult({
      success: false,
      error: error.message || 'Transfer failed'
    });
  } finally {
    setIsLoading(false);
  }
  };

  const validateAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const getExplorerUrl = (txHash: string) => {
    const explorerUrls: { [key: string]: string } = {
      sepolia: `https://sepolia.etherscan.io/tx/${txHash}`,
      amoy: `https://amoy.polygonscan.com/tx/${txHash}`,
      neon: `https://neon-devnet.blockscout.com/tx/${txHash}`
    };
    return explorerUrls[selectedChain] || `#${txHash}`;
  };

  const selectedTokenInfo = availableTokens.find(token => token.symbol === selectedToken);
  const selectedWalletInfo = wallets.find(w => w.bw_id.toString() === selectedWallet);
  const selectedChainInfo = supportedChains.find(chain => chain.id === selectedChain);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Transfer Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Tokens Onchain
          </CardTitle>
          <CardDescription>
            Transfer tokens within the same blockchain network
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmitTransfer} className="space-y-4">
            {/* Wallet Selection */}
            <div className="space-y-2">
              <Label htmlFor="wallet">From Wallet</Label>
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
            
            {/* Chain Selection - Now filtered based on wallet */}
            <div className="space-y-2">
              <Label htmlFor="chain">Blockchain Network</Label>
              <Select value={selectedChain} onValueChange={setSelectedChain}>
                <SelectTrigger>
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  {availableChains.map((chain) => (
                    <SelectItem key={chain.id} value={chain.id}>
                      <div className="flex items-center gap-2">
                        <span>{chain.icon}</span>
                        {chain.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Current Wallet Address Display */}
            {currentWalletAddress && (
              <div className="p-3 bg-muted rounded-lg">
                <Label className="text-xs text-muted-foreground">Wallet Address</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs font-mono flex-1">
                    {currentWalletAddress.slice(0, 8)}...{currentWalletAddress.slice(-8)}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(currentWalletAddress)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            
            {/* Token Selection */}
            {availableTokens.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="token">Token</Label>
                <Select value={selectedToken} onValueChange={setSelectedToken}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTokens.map((token, index) => (
                      <SelectItem key={`${token.symbol}-${index}`} value={token.symbol}>
                        <div className="flex items-center justify-between w-full">
                          <span>{token.symbol}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            Balance: {parseFloat(token.balance).toFixed(4)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Recipient Address */}
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className={recipientAddress && !validateAddress(recipientAddress) ? 'border-red-500' : ''}
              />
              {recipientAddress && !validateAddress(recipientAddress) && (
                <p className="text-xs text-red-500">Invalid address format</p>
              )}
            </div>
            
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  step="0.000001"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {selectedToken && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <span className="text-sm text-muted-foreground">{selectedToken}</span>
                  </div>
                )}
              </div>
              {selectedTokenInfo && (
                <p className="text-xs text-muted-foreground">
                  Available: {parseFloat(selectedTokenInfo.balance).toFixed(6)} {selectedToken}
                </p>
              )}
            </div>
            
            {/* Fee Estimates */}
            {(gasEstimate !== '0' || platformFeeEstimate !== '0') && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  <Label className="text-sm font-medium">Fee Estimates</Label>
                  {isLoadingFee && <LoadingSpinner size="sm" />}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Gas Fee:</span>
                    <span className="font-medium">{gasEstimate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Fee:</span>
                    <span className="font-medium">{platformFeeEstimate}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading || !selectedWallet || !selectedChain || !selectedToken || !recipientAddress || !amount}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Processing Transfer...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send {selectedToken || 'Tokens'}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Transaction Result & Info */}
      <div className="space-y-6">
        {/* Transaction Result */}
        {transactionResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {transactionResult.success ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Transaction Confirmed
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    Transaction Failed
                  </>
                )}
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              {transactionResult.success ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Confirmed
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Amount:</span>
                    <span className="font-medium">
                      {transactionResult.amount} {transactionResult.token}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Network:</span>
                    <span className="font-medium">
                      {selectedChainInfo?.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Gas Fee:</span>
                    <span className="font-medium">
                      {transactionResult.gas_fee ? `${parseFloat(transactionResult.gas_fee).toFixed(6)} ${selectedChainInfo?.symbol}` : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Transaction Hash:</span>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs font-mono">
                      <span className="flex-1 truncate">{transactionResult.tx_hash}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(transactionResult.tx_hash || '')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {transactionResult.tx_hash && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.open(getExplorerUrl(transactionResult.tx_hash!), '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on Block Explorer
                    </Button>
                  )}
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {transactionResult.error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Transfer Summary */}
        {selectedWalletInfo && selectedChainInfo && selectedToken && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transfer Summary</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">From Wallet:</span>
                <span className="font-medium">{selectedWalletInfo.wallet_name}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Network:</span>
                <div className="flex items-center gap-1">
                  <span>{selectedChainInfo.icon}</span>
                  <span className="font-medium">{selectedChainInfo.name}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Token:</span>
                <span className="font-medium">{selectedToken}</span>
              </div>
              
              {selectedTokenInfo && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Available Balance:</span>
                  <span className="font-medium">
                    {parseFloat(selectedTokenInfo.balance).toFixed(6)} {selectedToken}
                  </span>
                </div>
              )}

              {platformFeeSettings && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Platform Fee:</span>
                    <span>{platformFeeSettings.platform_fee_percentage}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Min Platform Fee:</span>
                    <span>${platformFeeSettings.minimum_platform_fee_usd}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Help Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Onchain Transfer Info</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Transfers within the same blockchain network</p>
            <p>• Faster confirmation times (usually 1-5 minutes)</p>
            <p>• Lower fees compared to crosschain transfers</p>
            <p>• Requires recipient to have address on same network</p>
            <p>• Gas fees paid in network native token</p>
            <p>• Platform fees calculated on transfer amount</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}