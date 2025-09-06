//Path: components/manual/TransactionForm.tsx

'use client';

import { useState } from 'react';
import { useSDK } from '@/hooks/useSDK';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ArrowRightLeft, Send, Plus, Copy, ExternalLink } from 'lucide-react';

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

interface TransactionFormProps {
  wallets: WalletData[];
  selectedWallet: WalletData | null;
  selectedChain: string;
  onChainChange: (chain: string) => void;
}

const supportedChains = [
  { id: 'sepolia', name: 'Sepolia Testnet', symbol: 'ETH', color: 'bg-blue-500' },
  { id: 'amoy', name: 'Polygon Amoy', symbol: 'POL', color: 'bg-purple-500' },
  { id: 'neon', name: 'Neon EVM', symbol: 'NEON', color: 'bg-green-500' },
];

export default function TransactionForm({ 
  wallets, 
  selectedWallet, 
  selectedChain, 
  onChainChange 
}: TransactionFormProps) {
  const [operationType, setOperationType] = useState<'send' | 'bridge' | 'receive'>('send');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [targetChain, setTargetChain] = useState('amoy');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  
  const { sdkReady, sdk } = useSDK();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sdkReady || !selectedWallet) return;

    setIsProcessing(true);
    setError('');
    setTxHash('');

    try {
      let response;

      if (operationType === 'send') {
        // Use crosschain transfer for sending USDC
        response = await sdk.crosschain.initiateTransfer({
          user_id: selectedWallet.user_id || parseInt(localStorage.getItem('user_id') || '0'),
          amount: parseFloat(amount),
          from_chain: selectedChain,
          to_chain: selectedChain, // Same chain for direct send
          token: 'USDC',
          recipient_address: recipient,
          return_address: selectedWallet.chains.find(c => c.chain === selectedChain)?.address || ''
        });
      } else if (operationType === 'bridge') {
        // Use crosschain bridge for bridging between chains
        response = await sdk.crosschain.initiateTransfer({
          user_id: selectedWallet.user_id || parseInt(localStorage.getItem('user_id') || '0'),
          amount: parseFloat(amount),
          from_chain: selectedChain,
          to_chain: targetChain,
          token: 'USDC',
          recipient_address: selectedWallet.chains.find(c => c.chain === targetChain)?.address || '',
          return_address: selectedWallet.chains.find(c => c.chain === selectedChain)?.address || ''
        });
      }

      if (response?.success || response?.data) {
        const transactionData = response.data || response;
        
        if (transactionData.tx_hash) {
          setTxHash(transactionData.tx_hash);
        }
        
        // Reset form on success
        setAmount('');
        setRecipient('');
      } else {
        setError(response?.error || 'Transaction failed');
      }
    } catch (err: any) {
      console.error('Transaction failed:', err);
      setError(err.message || 'Transaction failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
  };

  const getSelectedChainInfo = () => {
    return supportedChains.find(chain => chain.id === selectedChain);
  };

  const getCurrentChainBalance = () => {
    if (!selectedWallet) return '0.00';
    const chainData = selectedWallet.chains.find(c => c.chain === selectedChain);
    return chainData?.balance || '0.00';
  };

  const isFormValid = () => {
    if (!selectedWallet || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return false;
    
    if (operationType === 'send' && !recipient) return false;
    if (operationType === 'bridge' && !targetChain) return false;
    
    // Check if user has enough balance
    const balance = parseFloat(getCurrentChainBalance());
    if (parseFloat(amount) > balance) return false;
    
    return true;
  };

  const getExplorerUrl = (hash: string) => {
    const explorers: Record<string, string> = {
      sepolia: `https://sepolia.etherscan.io/tx/${hash}`,
      amoy: `https://amoy.polygonscan.com/tx/${hash}`,
      neon: `https://neonscan.org/tx/${hash}`
    };
    return explorers[selectedChain] || '#';
  };

  if (!sdkReady) {
    return (
      <div className="text-center py-8">
        <LoadingSpinner />
        <p className="text-muted-foreground mt-2">Loading transaction interface...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Operation Type Selector */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <Button
          variant={operationType === 'send' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setOperationType('send')}
          className={operationType === 'send' ? 'gradient-primary text-white border-0' : ''}
        >
          <Send className="h-4 w-4 mr-2" />
          Send USDC
        </Button>
        
        <Button
          variant={operationType === 'bridge' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setOperationType('bridge')}
          className={operationType === 'bridge' ? 'gradient-primary text-white border-0' : ''}
        >
          <ArrowRightLeft className="h-4 w-4 mr-2" />
          Bridge
        </Button>
        
        <Button
          variant={operationType === 'receive' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setOperationType('receive')}
          className={operationType === 'receive' ? 'gradient-primary text-white border-0' : ''}
        >
          <Plus className="h-4 w-4 mr-2" />
          Receive
        </Button>
      </div>

      {/* Wallet Info */}
      {selectedWallet && (
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">{selectedWallet.wallet_name}</h4>
              <p className="text-sm text-muted-foreground">
                {getSelectedChainInfo()?.name} • {getCurrentChainBalance()} USDC
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${getSelectedChainInfo()?.color}`} />
          </div>
        </div>
      )}

      {/* Transaction Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Chain Selection */}
        <div className="space-y-2">
          <Label>From Chain</Label>
          <Select value={selectedChain} onValueChange={onChainChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selectedWallet?.chains.map((chainData) => {
                const chainInfo = supportedChains.find(c => c.id === chainData.chain);
                return (
                  <SelectItem key={chainData.chain} value={chainData.chain}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${chainInfo?.color}`} />
                      {chainInfo?.name} ({chainData.balance} USDC)
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Amount */}
        {operationType !== 'receive' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Amount (USDC)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAmount(getCurrentChainBalance())}
                className="text-xs h-auto p-1"
              >
                Max: {getCurrentChainBalance()}
              </Button>
            </div>
            <Input
              type="number"
              step="0.000001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount..."
              disabled={isProcessing}
            />
            {amount && parseFloat(amount) > parseFloat(getCurrentChainBalance()) && (
              <p className="text-xs text-destructive">Insufficient balance</p>
            )}
          </div>
        )}

        {/* Recipient Address (Send only) */}
        {operationType === 'send' && (
          <div className="space-y-2">
            <Label>Recipient Address</Label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              disabled={isProcessing}
            />
          </div>
        )}

        {/* Target Chain (Bridge only) */}
        {operationType === 'bridge' && (
          <div className="space-y-2">
            <Label>To Chain</Label>
            <Select value={targetChain} onValueChange={setTargetChain}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {selectedWallet?.chains
                  .filter(chainData => chainData.chain !== selectedChain)
                  .map((chainData) => {
                    const chainInfo = supportedChains.find(c => c.id === chainData.chain);
                    return (
                      <SelectItem key={chainData.chain} value={chainData.chain}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${chainInfo?.color}`} />
                          {chainInfo?.name}
                        </div>
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Receive Instructions */}
        {operationType === 'receive' && selectedWallet && (
          <div className="p-4 bg-muted/50 rounded-lg border">
            <h5 className="font-medium mb-2">Receive Address</h5>
            <p className="text-sm text-muted-foreground mb-2">
              Send USDC to this address on {getSelectedChainInfo()?.name}:
            </p>
            {selectedWallet.chains
              .filter(chain => chain.chain === selectedChain)
              .map((chain, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-background rounded border">
                  <p className="font-mono text-sm break-all flex-1">{chain.address}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => copyAddress(chain.address)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Success Display */}
        {txHash && (
          <div className="text-sm text-secondary bg-secondary/10 p-3 rounded-lg">
            <p className="font-medium">Transaction Initiated!</p>
            <div className="flex items-center gap-2 mt-2">
              <p className="font-mono text-xs break-all flex-1">{txHash}</p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => window.open(getExplorerUrl(txHash), '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Submit Button */}
        {operationType !== 'receive' && (
          <Button
            type="submit"
            className="w-full gradient-primary text-white border-0"
            disabled={isProcessing || !isFormValid() || !sdkReady}
          >
            {isProcessing ? (
              <>
                <LoadingSpinner className="mr-2" size="sm" />
                Processing Transaction...
              </>
            ) : (
              `${operationType === 'send' ? 'Send' : 'Bridge'} ${amount || '0'} USDC`
            )}
          </Button>
        )}
      </form>
    </div>
  );
}