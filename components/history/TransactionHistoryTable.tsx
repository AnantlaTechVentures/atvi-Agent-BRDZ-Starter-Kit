//Path: components/history/TransactionHistoryTable.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSDK } from '@/hooks/useSDK';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, AlertCircle } from 'lucide-react';
import TransactionFilters from './TransactionFilters';
import TransactionTable from './TransactionTable';
import TransactionDetailModal from './TransactionDetailModal';

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

export interface CombinedTransaction {
  id: string;
  type: 'onchain' | 'crosschain';
  tx_hash?: string;
  log_id?: string;
  amount: string;
  token_symbol: string;
  status: string;
  from_chain?: string;
  to_chain?: string;
  source_address?: string;
  destination_address?: string;
  to_address?: string;
  gas_fee?: number;
  platform_fee?: number;
  created_at: string;
  updated_at?: string;
  explorer_url?: string;
  mint_tx_hash?: string;
  mint_explorer_url?: string;
  nonce?: string;
  chain_id?: string;
  tx_flow?: 'IN' | 'OUT';
}

export interface TransactionFilters {
  search: string;
  status: string;
  type: string;
  chain: string;
  token: string;
  dateFrom: string;
  dateTo: string;
}

export default function TransactionHistoryTable() {
  const { user } = useAuth();
  const { sdk, canMakeRequests } = useSDK();
  
  const [onchainTransactions, setOnchainTransactions] = useState<OnchainTransaction[]>([]);
  const [crosschainTransactions, setCrosschainTransactions] = useState<CrosschainTransaction[]>([]);
  const [combinedTransactions, setCombinedTransactions] = useState<CombinedTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<CombinedTransaction[]>([]);
  
  const [isLoadingOnchain, setIsLoadingOnchain] = useState(false);
  const [isLoadingCrosschain, setIsLoadingCrosschain] = useState(false);
  const [onchainError, setOnchainError] = useState<string | null>(null);
  const [crosschainError, setCrosschainError] = useState<string | null>(null);
  
  const [selectedTransaction, setSelectedTransaction] = useState<CombinedTransaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [filters, setFilters] = useState<TransactionFilters>({
    search: '',
    status: 'all',
    type: 'all',
    chain: 'all',
    token: 'all',
    dateFrom: '',
    dateTo: ''
  });

  // Load onchain transactions
  const loadOnchainTransactions = async () => {
    if (!canMakeRequests || !user?.user_id) {
      console.warn('Cannot load onchain transactions: SDK not ready or user not authenticated');
      return;
    }

    try {
      setIsLoadingOnchain(true);
      setOnchainError(null);
      
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
        
        setOnchainTransactions(onchainTxs);
        console.log('Loaded', onchainTxs.length, 'onchain transactions');
        
      } else {
        console.warn('Onchain API response format unexpected:', response);
        setOnchainTransactions([]);
      }
      
    } catch (error: any) {
      const errorMessage = `Failed to load onchain transactions: ${error.message || error}`;
      console.error('Onchain transaction loading error:', error);
      setOnchainError(errorMessage);
      setOnchainTransactions([]);
      
    } finally {
      setIsLoadingOnchain(false);
    }
  };

  // Load crosschain transactions
  const loadCrosschainTransactions = async () => {
    if (!canMakeRequests || !user?.user_id) {
      console.warn('Cannot load crosschain transactions: SDK not ready or user not authenticated');
      return;
    }

    try {
      setIsLoadingCrosschain(true);
      setCrosschainError(null);
      
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
        
        setCrosschainTransactions(crosschainTxs);
        console.log('Loaded', crosschainTxs.length, 'crosschain transactions');
        
      } else {
        console.warn('Crosschain API response format unexpected:', response);
        setCrosschainTransactions([]);
      }
      
    } catch (error: any) {
      const errorMessage = `Failed to load crosschain transactions: ${error.message || error}`;
      console.error('Crosschain transaction loading error:', error);
      setCrosschainError(errorMessage);
      setCrosschainTransactions([]);
      
    } finally {
      setIsLoadingCrosschain(false);
    }
  };

  // Convert onchain transaction to combined format
  const convertOnchainTx = (tx: OnchainTransaction): CombinedTransaction => ({
    id: tx.id,
    type: 'onchain',
    tx_hash: tx.tx_hash,
    amount: tx.amount,
    token_symbol: tx.token_symbol,
    status: tx.status,
    to_address: tx.destination_wallet,
    gas_fee: tx.gas_fee,
    platform_fee: tx.platform_fee,
    created_at: tx.created_at,
    explorer_url: tx.explorer_url,
    chain_id: tx.chain_id,
    tx_flow: tx.tx_flow
  });

  // Convert crosschain transaction to combined format
  const convertCrosschainTx = (tx: CrosschainTransaction): CombinedTransaction => ({
    id: tx.id,
    type: 'crosschain',
    log_id: tx.log_id,
    tx_hash: tx.tx_hash,
    amount: tx.amount,
    token_symbol: tx.currency_code,
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
  });

  // Combine and sort all transactions
  const combineTransactions = useCallback(() => {
    const combined: CombinedTransaction[] = [];
    
    // Add onchain transactions
    onchainTransactions.forEach(tx => {
      combined.push(convertOnchainTx(tx));
    });
    
    // Add crosschain transactions
    crosschainTransactions.forEach(tx => {
      combined.push(convertCrosschainTx(tx));
    });
    
    // Sort by creation date (newest first)
    combined.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    setCombinedTransactions(combined);
    console.log('Combined transactions:', combined.length, 'total transactions');
  }, [onchainTransactions, crosschainTransactions]);

  // Apply filters to combined transactions
  const applyFilters = useCallback(() => {
    let filtered = [...combinedTransactions];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.tx_hash?.toLowerCase().includes(searchLower) ||
        tx.log_id?.toLowerCase().includes(searchLower) ||
        tx.to_address?.toLowerCase().includes(searchLower) ||
        tx.source_address?.toLowerCase().includes(searchLower) ||
        tx.destination_address?.toLowerCase().includes(searchLower) ||
        tx.nonce?.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(tx => tx.status === filters.status);
    }
    
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(tx => tx.type === filters.type);
    }
    
    if (filters.chain && filters.chain !== 'all') {
      filtered = filtered.filter(tx => 
        tx.from_chain === filters.chain || 
        tx.to_chain === filters.chain ||
        tx.chain_id === filters.chain
      );
    }
    
    if (filters.token && filters.token !== 'all') {
      filtered = filtered.filter(tx => tx.token_symbol === filters.token);
    }
    
    if (filters.dateFrom) {
      filtered = filtered.filter(tx => 
        new Date(tx.created_at) >= new Date(filters.dateFrom)
      );
    }
    
    if (filters.dateTo) {
      filtered = filtered.filter(tx => 
        new Date(tx.created_at) <= new Date(filters.dateTo)
      );
    }
    
    setFilteredTransactions(filtered);
  }, [combinedTransactions, filters]);

  // Load all transactions
  const loadAllTransactions = useCallback(async () => {
    setOnchainError(null);
    setCrosschainError(null);
    
    await Promise.all([
      loadOnchainTransactions(),
      loadCrosschainTransactions()
    ]);
  }, [canMakeRequests, user?.user_id]);

  // Handle transaction row click
  const handleRowClick = (transaction: CombinedTransaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  // Load transactions on mount
  useEffect(() => {
    if (user?.user_id && canMakeRequests) {
      loadAllTransactions();
    }
  }, [loadAllTransactions]);

  // Combine transactions when child data changes
  useEffect(() => {
    combineTransactions();
  }, [combineTransactions]);

  // Apply filters when transactions or filters change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const isLoading = isLoadingOnchain || isLoadingCrosschain;
  const hasError = onchainError || crosschainError;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            Complete history of all onchain and crosschain transactions
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadAllTransactions}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Messages */}
      {hasError && (
        <div className="space-y-2">
          {onchainError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Onchain: {onchainError}</span>
            </div>
          )}
          {crosschainError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Crosschain: {crosschainError}</span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <TransactionFilters 
        filters={filters}
        setFilters={setFilters}
      />

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transactions ({filteredTransactions.length})</span>
            {isLoading && <LoadingSpinner size="sm" />}
          </CardTitle>
          {!isLoading && (
            <div className="text-sm text-muted-foreground">
              Onchain: {onchainTransactions.length} | Crosschain: {crosschainTransactions.length}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading && combinedTransactions.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <TransactionTable 
              transactions={filteredTransactions}
              onRowClick={handleRowClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}