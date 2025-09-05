//Path: app/transactions/page.tsx

'use client';

import { useState } from 'react';
import { useRequireAuth } from '@/contexts/AuthContext';
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
  AlertCircle
} from 'lucide-react';

export default function TransactionsPage() {
  const { isAuthenticated, ekycStatus, isLoading } = useRequireAuth();
  const [activeTab, setActiveTab] = useState<'onchain' | 'crosschain'>('onchain');

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
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="font-semibold">0</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="font-semibold">0</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded flex items-center justify-center">
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="font-semibold">0</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="font-semibold">$0.00</p>
              </div>
            </div>
          </div>
        </div>

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