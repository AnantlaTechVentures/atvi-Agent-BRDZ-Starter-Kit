//Path: components/manual/TransactionForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSDK } from '@/hooks/useSDK';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ArrowRightLeft, Send, Plus } from 'lucide-react';
import OnchainTransactions from '@/components/transactions/OnchainTransactions';
import CrosschainTransactions from '@/components/transactions/CrosschainTransactions';

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

export default function TransactionForm({ 
  wallets, 
  selectedWallet, 
  selectedChain, 
  onChainChange 
}: TransactionFormProps) {
  const [operationType, setOperationType] = useState<'send' | 'bridge'>('send');
  
  const router = useRouter();
  const { sdkReady, sdk } = useSDK();

  // Handle receive button click - redirect to manual page
  const handleReceiveClick = () => {
    router.push('/manual');
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
          variant="ghost"
          size="sm"
          onClick={handleReceiveClick}
        >
          <Plus className="h-4 w-4 mr-2" />
          Receive
        </Button>
      </div>

      {/* Send USDC - Show OnchainTransactions Component */}
      {operationType === 'send' && (
        <div>
          <OnchainTransactions />
        </div>
      )}

      {/* Bridge USDC - Show CrosschainTransactions Component */}
      {operationType === 'bridge' && (
        <div>
          <CrosschainTransactions />
        </div>
      )}
    </div>
  );
}