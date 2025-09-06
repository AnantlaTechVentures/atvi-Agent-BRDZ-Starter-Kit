//Path: app/history/page.tsx

'use client';

import { useRequireAuth } from '@/contexts/AuthContext';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import TransactionHistoryTable from '@/components/history/TransactionHistoryTable';

export default function HistoryPage() {
  const { isAuthenticated, ekycStatus, isLoading } = useRequireAuth();

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
        <h1 className="text-3xl font-bold mb-8">Transaction History</h1>
        <TransactionHistoryTable />
      </div>
    </ProtectedLayout>
  );
}