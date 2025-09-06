//Path: components/history/CombinedTransactionHistory.tsx

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
import OnchainTransactionHistory, { OnchainTransaction } from './OnchainTransactionHistory';
import CrosschainTransactionHistory, { CrosschainTransaction } from './CrosschainTransactionHistory';

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

export default function CombinedTransactionHistory() {
  const { user } = useAuth();
  const { canMakeRequests } = useSDK();
  
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
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [filters, setFilters] = useState<TransactionFilters>({
    search: '',
    status: 'all',
    type: 'all',
    chain: 'all',
    token: 'all',
    dateFrom: '',
    dateTo: ''
  });

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

  // Handle data loading from child components
  const handleOnchainData = useCallback((transactions: OnchainTransaction[]) => {
    setOnchainTransactions(transactions);
  }, []);

  const handleCrosschainData = useCallback((transactions: CrosschainTransaction[]) => {
    setCrosschainTransactions(transactions);
  }, []);

  const handleOnchainError = useCallback((error: string) => {
    setOnchainError(error);
  }, []);

  const handleCrosschainError = useCallback((error: string) => {
    setCrosschainError(error);
  }, []);

  const handleOnchainLoading = useCallback((loading: boolean) => {
    setIsLoadingOnchain(loading);
  }, []);

  const handleCrosschainLoading = useCallback((loading: boolean) => {
    setIsLoadingCrosschain(loading);
  }, []);

  // Refresh all data
  const refreshAllTransactions = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    setOnchainError(null);
    setCrosschainError(null);
  }, []);

  // Handle transaction row click
  const handleRowClick = (transaction: CombinedTransaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

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
      {/* Hidden child components that fetch data */}
      <div className="hidden">
        <OnchainTransactionHistory
          key={`onchain-${refreshKey}`}
          onDataLoad={handleOnchainData}
          onError={handleOnchainError}
          onLoading={handleOnchainLoading}
        />
        <CrosschainTransactionHistory
          key={`crosschain-${refreshKey}`}
          onDataLoad={handleCrosschainData}
          onError={handleCrosschainError}
          onLoading={handleCrosschainLoading}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Transaction History</h2>
          <p className="text-muted-foreground">
            Complete history of all onchain and crosschain transactions
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshAllTransactions}
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