//Path: app/transactions/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth, useAuth } from '@/contexts/AuthContext';
import { useSDK } from '@/hooks/useSDK';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import OnchainTransactions from '@/components/transactions/OnchainTransactions';
import CrosschainTransactions from '@/components/transactions/CrosschainTransactions';
import { 
  ArrowUpDown, 
  Repeat,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Activity,
  TrendingUp
} from 'lucide-react';

interface TransactionStats {
  onchain: {
    pending: number;
    completed: number;
    failed: number;
    volumeUSD: number;
  };
  crosschain: {
    pending: number;
    completed: number;
    failed: number;
    volumeUSD: number;
  };
  total: {
    pending: number;
    completed: number;
    failed: number;
    volumeUSD: number;
  };
  lastUpdated: string;
}

export default function TransactionsPage() {
  const { isAuthenticated, ekycStatus, isLoading } = useRequireAuth();
  const { user } = useAuth();
  const { sdk, canMakeRequests } = useSDK();
  const [activeTab, setActiveTab] = useState<'onchain' | 'crosschain'>('onchain');
  
  // Stats state with separated breakdown
  const [stats, setStats] = useState<TransactionStats>({
    onchain: { pending: 0, completed: 0, failed: 0, volumeUSD: 0 },
    crosschain: { pending: 0, completed: 0, failed: 0, volumeUSD: 0 },
    total: { pending: 0, completed: 0, failed: 0, volumeUSD: 0 },
    lastUpdated: ''
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Load transaction stats with separation
  const loadTransactionStats = async () => {
    if (!canMakeRequests || !user?.user_id) {
      console.log('Debug - Cannot make requests or no user ID');
      return;
    }

    try {
      setIsLoadingStats(true);
      const userId = typeof user.user_id === 'string' ? parseInt(user.user_id) : user.user_id;
      
      console.log('Debug - User ID:', userId);
      console.log('Debug - SDK onchain available:', !!sdk.onchain);
      console.log('Debug - SDK crosschain available:', !!sdk.crosschain);
      
      // Get both onchain and crosschain transactions
      const [onchainResponse, crosschainResponse] = await Promise.all([
        sdk.onchain.getTransactionHistory(userId, { limit: 100 }).catch(() => ({ success: false, data: { transactions: [] } })),
        sdk.crosschain.getCTransactionHistory(userId, { limit: 100 }).catch(() => ({ success: false, data: { transactions: [] } })),
      ]);
      
      console.log('Debug - Onchain Response:', onchainResponse);
      console.log('Debug - Crosschain Response:', crosschainResponse);
      
      // Process onchain stats
      const onchainTxs = onchainResponse?.success ? onchainResponse.data.transactions : [];
      const onchainStats = {
        pending: onchainTxs.filter((tx: any) => tx.status === 'PENDING').length,
        completed: onchainTxs.filter((tx: any) => tx.status === 'CONFIRMED').length,
        failed: onchainTxs.filter((tx: any) => tx.status === 'FAILED').length,
        volumeUSD: 0
      };
      
      // Calculate onchain volume
      const onchainCompletedTxs = onchainTxs.filter((tx: any) => tx.status === 'CONFIRMED');
      for (const tx of onchainCompletedTxs) {
        const amount = parseFloat(tx.amount) || 0;
        if (tx.token_symbol === 'USDC') {
          onchainStats.volumeUSD += amount;
        } else {
          try {
            const rateResponse = await sdk.fx.convertAll(tx.token_symbol, 'USD', 1);
            if (rateResponse?.success && rateResponse?.data?.converted_amount) {
              const rate = parseFloat(rateResponse.data.converted_amount);
              onchainStats.volumeUSD += amount * rate;
            }
          } catch (error) {
            console.log('Debug - FX conversion failed for onchain:', tx.token_symbol);
          }
        }
      }
      
      // Process crosschain stats
      const crosschainTxs = crosschainResponse?.success ? crosschainResponse.data.transactions : [];
      console.log('Debug - Crosschain transactions count:', crosschainTxs.length);
      
      const crosschainStats = {
        pending: crosschainTxs.filter((tx: any) => tx.status === 'INITIATED').length,
        completed: crosschainTxs.filter((tx: any) => tx.status === 'MINTED').length, // ✅ Benar
        failed: crosschainTxs.filter((tx: any) => tx.status === 'FAILED').length,
        volumeUSD: 0
      };
      
      // Calculate crosschain volume
      const crosschainCompletedTxs = crosschainTxs.filter((tx: any) => tx.status === 'COMPLETED');
      for (const tx of crosschainCompletedTxs) {
        const amount = parseFloat(tx.amount) || 0;
        if (tx.currency_code === 'USDC') {
          crosschainStats.volumeUSD += amount;
        } else {
          try {
            const rateResponse = await sdk.fx.convertAll(tx.currency_code, 'USD', 1);
            if (rateResponse?.success && rateResponse?.data?.converted_amount) {
              const rate = parseFloat(rateResponse.data.converted_amount);
              crosschainStats.volumeUSD += amount * rate;
            }
          } catch (error) {
            console.log('Debug - FX conversion failed for crosschain:', tx.currency_code);
          }
        }
      }
      
      // Calculate totals
      const totalStats = {
        pending: onchainStats.pending + crosschainStats.pending,
        completed: onchainStats.completed + crosschainStats.completed,
        failed: onchainStats.failed + crosschainStats.failed,
        volumeUSD: onchainStats.volumeUSD + crosschainStats.volumeUSD
      };
      
      console.log('Debug - Final stats breakdown:', {
        onchain: onchainStats,
        crosschain: crosschainStats,
        total: totalStats
      });
      
      setStats({
        onchain: onchainStats,
        crosschain: crosschainStats,
        total: totalStats,
        lastUpdated: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to load transaction stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.user_id) {
      loadTransactionStats();
    }
  }, [canMakeRequests, user?.user_id]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || ekycStatus !== 'APPROVED') {
    return null;
  }

  return (
    <ProtectedLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Transactions</h1>
            <p className="text-muted-foreground">
              Send tokens within chains or across different blockchains
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadTransactionStats}
            disabled={isLoadingStats}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStats ? 'animate-spin' : ''}`} />
            Refresh Stats
          </Button>
        </div>

        {/* Separated Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          {/* Onchain Pending */}
          <div className="p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Onchain Pending</p>
                <p className="font-semibold">
                  {isLoadingStats ? <LoadingSpinner size="sm" /> : stats.onchain.pending}
                </p>
              </div>
            </div>
          </div>

          {/* Onchain Completed */}
          <div className="p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Onchain Done</p>
                <p className="font-semibold">
                  {isLoadingStats ? <LoadingSpinner size="sm" /> : stats.onchain.completed}
                </p>
              </div>
            </div>
          </div>

          {/* Crosschain Pending */}
          <div className="p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded flex items-center justify-center">
                <Activity className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cross Pending</p>
                <p className="font-semibold">
                  {isLoadingStats ? <LoadingSpinner size="sm" /> : stats.crosschain.pending}
                </p>
              </div>
            </div>
          </div>

          {/* Crosschain Completed */}
          <div className="p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900 rounded flex items-center justify-center">
                <Repeat className="h-4 w-4 text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cross Done</p>
                <p className="font-semibold">
                  {isLoadingStats ? <LoadingSpinner size="sm" /> : stats.crosschain.completed}
                </p>
              </div>
            </div>
          </div>

          {/* Total Failed */}
          <div className="p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded flex items-center justify-center">
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Failed</p>
                <p className="font-semibold">
                  {isLoadingStats ? <LoadingSpinner size="sm" /> : stats.total.failed}
                </p>
              </div>
            </div>
          </div>

          {/* Total Volume */}
          <div className="p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Volume</p>
                <p className="font-semibold">
                  {isLoadingStats ? <LoadingSpinner size="sm" /> : formatCurrency(stats.total.volumeUSD)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Volume Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-card rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Onchain Volume</p>
                <p className="text-lg font-semibold">
                  {isLoadingStats ? <LoadingSpinner size="sm" /> : formatCurrency(stats.onchain.volumeUSD)}
                </p>
              </div>
              <ArrowUpDown className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          
          <div className="p-4 bg-card rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Crosschain Volume</p>
                <p className="text-lg font-semibold">
                  {isLoadingStats ? <LoadingSpinner size="sm" /> : formatCurrency(stats.crosschain.volumeUSD)}
                </p>
              </div>
              <Repeat className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Last Updated Info */}
        {stats.lastUpdated && !isLoadingStats && (
          <div className="text-xs text-muted-foreground mb-4 text-right">
            Last updated: {new Date(stats.lastUpdated).toLocaleString()}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-4 mb-6 border-b">
          <Button
            variant={activeTab === 'onchain' ? 'default' : 'ghost'}
            className={`px-4 py-2 rounded-t-lg rounded-b-none border-b-2 ${
              activeTab === 'onchain' 
                ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 border-blue-600' 
                : 'border-transparent'
            }`}
            onClick={() => setActiveTab('onchain')}
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Onchain Transfers
          </Button>
          
          <Button
            variant={activeTab === 'crosschain' ? 'default' : 'ghost'}
            className={`px-4 py-2 rounded-t-lg rounded-b-none border-b-2 ${
              activeTab === 'crosschain' 
                ? 'bg-purple-50 dark:bg-purple-950 text-purple-600 border-purple-600' 
                : 'border-transparent'
            }`}
            onClick={() => setActiveTab('crosschain')}
          >
            <Repeat className="h-4 w-4 mr-2" />
            Crosschain Transfers
          </Button>
        </div>

        {/* Tab Content */}
        <div className="min-h-96">
          {activeTab === 'onchain' && <OnchainTransactions />}
          {activeTab === 'crosschain' && <CrosschainTransactions />}
        </div>
      </div>
    </ProtectedLayout>
  );
}