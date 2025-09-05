'use client';

import { Suspense } from 'react';
import LoginStep2 from '@/components/auth/LoginStep2';
import AuthLayout from '@/components/auth/AuthLayout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

function VerifyContent() {
  return (
    <AuthLayout
      title="Mobile Verification"
      subtitle="Approve login using your mobile device"
    >
      <LoginStep2 />
    </AuthLayout>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}