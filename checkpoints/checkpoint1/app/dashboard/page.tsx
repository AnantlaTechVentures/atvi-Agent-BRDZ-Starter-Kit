'use client';

import { useRequireAuth } from '@/contexts/AuthContext';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import WalletDashboard from '@/components/wallet/WalletDashboard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function DashboardPage() {
  const { isAuthenticated, ekycStatus, isLoading } = useRequireAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || ekycStatus !== 'APPROVED') {
    return null; // useRequireAuth will redirect
  }

  return (
    <ProtectedLayout>
      <WalletDashboard />
    </ProtectedLayout>
  );
}