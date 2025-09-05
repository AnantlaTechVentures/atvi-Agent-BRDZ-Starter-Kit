//Path: components/ekyc/EkycStatus.tsx

'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSDK } from '@/hooks/useSDK';

interface EkycStatusProps {
  onStatusChange?: (newStatus: string) => void;
  showActions?: boolean;
}

export default function EkycStatus({ 
  onStatusChange,
  showActions = true 
}: EkycStatusProps) {
  const [status, setStatus] = useState<string>('PENDING');
  const [isLoading, setIsLoading] = useState(false);
  const { sdkReady, sdk } = useSDK();

  // Get status from localStorage
  useEffect(() => {
    const ekycStatus = localStorage.getItem('ekyc_status') || 'PENDING';
    setStatus(ekycStatus);
  }, []);

  const getStatusConfig = () => {
    switch (status) {
      case 'APPROVED':
        return {
          icon: CheckCircle,
          label: 'Verified',
          description: 'Your identity has been successfully verified',
          color: 'text-secondary',
          bgColor: 'bg-secondary/10',
          borderColor: 'border-secondary/20',
          actionLabel: 'Continue to Dashboard'
        };
      case 'REJECTED':
        return {
          icon: XCircle,
          label: 'Rejected',
          description: 'Identity verification failed. Please try again.',
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          borderColor: 'border-destructive/20',
          actionLabel: 'Retry Verification'
        };
      default:
        return {
          icon: Clock,
          label: 'Pending',
          description: 'Complete identity verification to access all features.',
          color: 'text-warning',
          bgColor: 'bg-warning/10',
          borderColor: 'border-warning/20',
          actionLabel: 'Start Verification'
        };
    }
  };

  const handleStartVerification = async () => {
    if (!sdkReady) return;

    setIsLoading(true);
    try {
      const userId = localStorage.getItem('user_id');
      if (userId) {
        const response = await sdk.ekyc.generateWebSdkLink(userId);
        
        if (response.success || response.data) {
          const webSdkUrl = response.data?.web_sdk_url || response.web_sdk_url;
          if (webSdkUrl) {
            window.open(webSdkUrl, '_blank');
          }
        }
      }
    } catch (error) {
      console.error('Failed to start eKYC verification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-xl border ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${config.color}`} />
          <div>
            <p className="font-semibold">eKYC Status</p>
            <p className={`text-sm font-medium ${config.color}`}>{config.label}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {config.description}
            </p>
          </div>
        </div>

        {showActions && status !== 'APPROVED' && (
          <Button
            size="sm"
            onClick={handleStartVerification}
            disabled={isLoading || !sdkReady}
            className="whitespace-nowrap"
          >
            {config.actionLabel}
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}