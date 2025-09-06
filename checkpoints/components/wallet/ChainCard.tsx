//Path: components/wallet/ChainCard.tsx

'use client';

import { Copy, ExternalLink, RefreshCw, Send, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface ChainCardProps {
  chain: {
    chain: string;
    address: string;
    balance: string;
    native_balance: string;
    usd_value?: number;
    native_usd_value?: number;
  };
  onRefresh?: () => void;
  onSend?: (chain: string, address: string) => void;
  onReceive?: (chain: string, address: string) => void;
}

export default function ChainCard({ chain, onRefresh, onSend, onReceive }: ChainCardProps) {
  const [copied, setCopied] = useState(false);
  
  // CHAIN YANG SUPPORTED di BRDZ SDK:
  // - Sepolia (Ethereum Testnet): 11155111
  // - Amoy (Polygon Testnet): 80002  
  // - Neon (Neon EVM Devnet): 245022926
  const getChainConfig = (chainName: string) => {
    switch (chainName.toLowerCase()) {
      case 'sepolia':
        return { 
          name: 'Sepolia Testnet', 
          shortName: 'Sepolia',
          color: 'bg-blue-500', 
          explorer: 'https://sepolia.etherscan.io',
          nativeSymbol: 'ETH',
          chainId: 11155111,
          icon: '⟠'
        };
      case 'amoy':
        return { 
          name: 'Polygon Amoy Testnet', 
          shortName: 'Amoy',
          color: 'bg-purple-500', 
          explorer: 'https://amoy.polygonscan.com',
          nativeSymbol: 'POL',
          chainId: 80002,
          icon: '⬡'
        };
      case 'neon':
        return { 
          name: 'Neon EVM Devnet', 
          shortName: 'Neon Devnet',
          color: 'bg-green-500', 
          explorer: 'https://neon-devnet.blockscout.com',
          nativeSymbol: 'NEON',
          chainId: 245022926, // DEVNET CHAIN ID
          icon: '◉'
        };
      default:
        return { 
          name: chainName.charAt(0).toUpperCase() + chainName.slice(1), 
          shortName: chainName,
          color: 'bg-gray-500', 
          explorer: '#',
          nativeSymbol: 'UNKNOWN',
          chainId: 0,
          icon: '⚪'
        };
    }
  };

  const config = getChainConfig(chain.chain);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(chain.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback untuk browser lama
      const textArea = document.createElement('textarea');
      textArea.value = chain.address;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortenAddress = (address: string) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string | number) => {
    const num = typeof balance === 'string' ? parseFloat(balance) : balance;
    if (isNaN(num)) return '0.000000';
    
    if (num === 0) return '0.000000';
    if (num < 0.000001) return '< 0.000001';
    if (num < 1) return num.toFixed(6);
    if (num < 1000) return num.toFixed(4);
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const formatUsdValue = (usdValue?: number) => {
    if (!usdValue || usdValue === 0) return '$0.00';
    if (usdValue < 0.01) return '< $0.01';
    return `$${usdValue.toFixed(2)}`;
  };

  return (
    <div className="p-4 bg-card rounded-xl border border-border/50 hover:border-border transition-all duration-200 hover:shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center text-white font-semibold text-sm`}>
            {config.icon}
          </div>
          <div>
            <Badge variant="secondary" className="text-xs font-medium mb-1">
              {config.shortName}
            </Badge>
            <p className="text-xs text-muted-foreground">{config.name}</p>
          </div>
        </div>
        
        <div className="flex gap-1">
          {onRefresh && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 hover:bg-muted"
              onClick={onRefresh}
              title="Refresh Balance"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Address Section */}
      <div className="mb-4 p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
            <p className="text-sm font-mono text-foreground truncate" title={chain.address}>
              {shortenAddress(chain.address)}
            </p>
          </div>
          <div className="flex gap-1 ml-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 hover:bg-background"
              onClick={copyAddress}
              title={copied ? 'Copied!' : 'Copy Address'}
            >
              <Copy className={`h-3 w-3 ${copied ? 'text-green-500' : ''}`} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 hover:bg-background"
              onClick={() => window.open(`${config.explorer}/address/${chain.address}`, '_blank')}
              title="View on Explorer"
              disabled={config.explorer === '#'}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Balance Section */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-muted/20 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">USDC Balance</p>
            <Badge variant="outline" className="text-xs px-1.5 py-0">USDC</Badge>
          </div>
          <p className="text-base font-semibold text-foreground">
            {formatBalance(chain.balance)}
          </p>
          {chain.usd_value !== undefined && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatUsdValue(chain.usd_value)}
            </p>
          )}
        </div>
        
        <div className="p-3 bg-muted/20 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">Native Balance</p>
            <Badge variant="outline" className="text-xs px-1.5 py-0">{config.nativeSymbol}</Badge>
          </div>
          <p className="text-base font-semibold text-foreground">
            {formatBalance(chain.native_balance)}
          </p>
          {chain.native_usd_value !== undefined && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatUsdValue(chain.native_usd_value)}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {onReceive && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8"
            onClick={() => onReceive(chain.chain, chain.address)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Receive
          </Button>
        )}
        
        {onSend && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8"
            onClick={() => onSend(chain.chain, chain.address)}
            disabled={parseFloat(chain.balance) === 0 && parseFloat(chain.native_balance) === 0}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Send
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="px-3 h-8"
          onClick={() => window.open(`${config.explorer}/address/${chain.address}`, '_blank')}
          disabled={config.explorer === '#'}
        >
          Explorer
        </Button>
      </div>

      {/* Chain Info Footer */}
      <div className="mt-3 pt-3 border-t border-border/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Chain ID: {config.chainId}</span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            {chain.chain.toLowerCase() === 'neon' ? 'Devnet' : 'Testnet'}
          </span>
        </div>
      </div>
    </div>
  );
}