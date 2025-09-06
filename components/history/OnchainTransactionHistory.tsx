//Path: components/history/OnchainTransactionHistory.tsx

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSDK } from '@/hooks/useSDK';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AlertCircle } from 'lucide-react';

export interface OnchainTransaction {
  id: string;
  tx_hash: string;
  amount: string;
  token_symbol: string;
  status: string;
  destination_wallet: string;
  gas_fee: number;
  platform_fee: number;
  created_at: string;
  explorer_url?: string;
  chain_id: string;
  token_contract: string;
  tx_flow: 'IN' | 'OUT';
}

interface OnchainTransactionHistoryProps {
  onDataLoad?: (transactions: OnchainTransaction[]) => void;
  onError?: (error: string) => void;
  onLoading?: (loading: boolean) => void;
}

export default function OnchainTransactionHistory({ 
  onDataLoad, 
  onError, 
  onLoading 
}: OnchainTransactionHistoryProps) {
  const { user } = useAuth();
  const { sdk, canMakeRequests } = useSDK();
  
  const [transactions, setTransactions] = useState<OnchainTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOnchainTransactions = async () => {
    if (!canMakeRequests || !user?.user_id) {
      console.warn('Cannot load onchain transactions: SDK not ready or user not authenticated');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      onLoading?.(true);
      
      console.log('Loading onchain transactions for user:', user.user_id);
      
      const userId = parseInt(user.user_id);
      if (isNaN(userId)) {
        throw new Error('Invalid user ID format');
      }

      const response = await sdk.onchain.getTransactionHistory(userId, { 
        limit: 100,
        offset: 0 
      });
      
      console.log('Onchain transaction response:', response);

      if (response?.success && response.data?.transactions) {
        const onchainTxs: OnchainTransaction[] = response.data.transactions.map((tx: any) => ({
          id: tx.tx_hash || tx.id,
          tx_hash: tx.tx_hash,
          amount: tx.amount,
          token_symbol: tx.token_symbol,
          status: tx.status,
          destination_wallet: tx.destination_wallet,
          gas_fee: tx.gas_fee || 0,
          platform_fee: tx.platform_fee || 0,
          created_at: tx.created_at,
          explorer_url: tx.explorer_url,
          chain_id: tx.chain_id,
          token_contract: tx.token_contract,
          tx_flow: tx.tx_flow || 'OUT'
        }));
        
        setTransactions(onchainTxs);
        onDataLoad?.(onchainTxs);
        console.log('Loaded', onchainTxs.length, 'onchain transactions');
        
      } else {
        console.warn('Onchain API response format unexpected:', response);
        setTransactions([]);
        onDataLoad?.([]);
      }
      
    } catch (error: any) {
      const errorMessage = `Failed to load onchain transactions: ${error.message || error}`;
      console.error('Onchain transaction loading error:', error);
      setError(errorMessage);
      onError?.(errorMessage);
      
      // Don't hide the error - let parent components know
      setTransactions([]);
      onDataLoad?.([]);
      
    } finally {
      setIsLoading(false);
      onLoading?.(false);
    }
  };

  useEffect(() => {
    if (user?.user_id && canMakeRequests) {
      loadOnchainTransactions();
    }
  }, [canMakeRequests, user?.user_id]);

  // If this component is used standalone (not as child), render its own UI
  if (onDataLoad) {
    // Parent component will handle rendering
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Onchain Transactions</h3>
        {isLoading && <LoadingSpinner size="sm" />}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {!isLoading && !error && transactions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No onchain transactions found
        </div>
      )}

      {!isLoading && transactions.length > 0 && (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div key={tx.id} className="border rounded-lg p-4 bg-card">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{tx.token_symbol} {tx.amount}</div>
                  <div className="text-sm text-muted-foreground">
                    {tx.tx_flow === 'IN' ? 'Received' : 'Sent'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm px-2 py-1 rounded ${
                    tx.status === 'completed' ? 'bg-green-100 text-green-700' :
                    tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {tx.status}
                  </div>
                  {tx.explorer_url && (
                    <a 
                      href={tx.explorer_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-1 block"
                    >
                      View on Explorer
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}