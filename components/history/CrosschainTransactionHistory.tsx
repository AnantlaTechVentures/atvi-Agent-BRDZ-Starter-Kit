//Path: components/history/CrosschainTransactionHistory.tsx

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSDK } from '@/hooks/useSDK';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AlertCircle } from 'lucide-react';

export interface CrosschainTransaction {
  id: string;
  log_id: string;
  tx_hash?: string;
  amount: string;
  currency_code: string;
  status: string;
  from_chain: string;
  to_chain: string;
  source_address: string;
  destination_address: string;
  created_at: string;
  updated_at?: string;
  explorer_url?: string;
  mint_tx_hash?: string;
  mint_explorer_url?: string;
  nonce?: string;
}

interface CrosschainTransactionHistoryProps {
  onDataLoad?: (transactions: CrosschainTransaction[]) => void;
  onError?: (error: string) => void;
  onLoading?: (loading: boolean) => void;
}

export default function CrosschainTransactionHistory({ 
  onDataLoad, 
  onError, 
  onLoading 
}: CrosschainTransactionHistoryProps) {
  const { user } = useAuth();
  const { sdk, canMakeRequests } = useSDK();
  
  const [transactions, setTransactions] = useState<CrosschainTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCrosschainTransactions = async () => {
    if (!canMakeRequests || !user?.user_id) {
      console.warn('Cannot load crosschain transactions: SDK not ready or user not authenticated');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      onLoading?.(true);
      
      console.log('Loading crosschain transactions for user:', user.user_id);
      
      const userId = parseInt(user.user_id);
      if (isNaN(userId)) {
        throw new Error('Invalid user ID format');
      }

      // Check if getCTransactionHistory method exists
      if (!sdk.crosschain.getCTransactionHistory) {
        throw new Error('getCTransactionHistory method not available in SDK');
      }

      const response = await sdk.crosschain.getCTransactionHistory(userId, { 
        limit: 100,
        offset: 0 
      });
      
      console.log('Crosschain transaction response:', response);

      if (response?.success && response.data?.transactions) {
        const crosschainTxs: CrosschainTransaction[] = response.data.transactions.map((tx: any) => ({
          id: tx.log_id || tx.id,
          log_id: tx.log_id,
          tx_hash: tx.tx_hash,
          amount: tx.amount,
          currency_code: tx.currency_code,
          status: tx.status,
          from_chain: tx.from_chain,
          to_chain: tx.to_chain,
          source_address: tx.source_address,
          destination_address: tx.destination_address,
          created_at: tx.created_at,
          updated_at: tx.updated_at,
          explorer_url: tx.explorer_url,
          mint_tx_hash: tx.mint_tx_hash,
          mint_explorer_url: tx.mint_explorer_url,
          nonce: tx.nonce
        }));
        
        setTransactions(crosschainTxs);
        onDataLoad?.(crosschainTxs);
        console.log('Loaded', crosschainTxs.length, 'crosschain transactions');
        
      } else {
        console.warn('Crosschain API response format unexpected:', response);
        setTransactions([]);
        onDataLoad?.([]);
      }
      
    } catch (error: any) {
      const errorMessage = `Failed to load crosschain transactions: ${error.message || error}`;
      console.error('Crosschain transaction loading error:', error);
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
      loadCrosschainTransactions();
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
        <h3 className="text-lg font-semibold">Crosschain Transactions</h3>
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
          No crosschain transactions found
        </div>
      )}

      {!isLoading && transactions.length > 0 && (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div key={tx.id} className="border rounded-lg p-4 bg-card">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{tx.currency_code} {tx.amount}</div>
                  <div className="text-sm text-muted-foreground">
                    {tx.from_chain} → {tx.to_chain}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleString()}
                  </div>
                  {tx.nonce && (
                    <div className="text-xs text-muted-foreground">
                      Nonce: {tx.nonce}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className={`text-sm px-2 py-1 rounded ${
                    tx.status === 'completed' ? 'bg-green-100 text-green-700' :
                    tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    tx.status === 'minted' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {tx.status}
                  </div>
                  <div className="mt-1 space-y-1">
                    {tx.explorer_url && (
                      <a 
                        href={tx.explorer_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline block"
                      >
                        View Burn TX
                      </a>
                    )}
                    {tx.mint_explorer_url && (
                      <a 
                        href={tx.mint_explorer_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-green-600 hover:underline block"
                      >
                        View Mint TX
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}