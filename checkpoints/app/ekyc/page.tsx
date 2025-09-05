'use client';

import { useRequireAuth } from '@/contexts/AuthContext';
import EkycVerification from '@/components/ekyc/EkycVerification';
import AuthLayout from '@/components/auth/AuthLayout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function EkycPage() {
  const { isAuthenticated, ekycStatus, isLoading } = useRequireAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // useRequireAuth will redirect
  }

  if (ekycStatus === 'APPROVED') {
    // This shouldn't happen due to useRequireAuth, but just in case
    window.location.href = '/dashboard';
    return null;
  }

  return (
    <AuthLayout
      title="Identity Verification"
      subtitle="Complete your eKYC to access all features"
    >
      <EkycVerification />
    </AuthLayout>
  );
}