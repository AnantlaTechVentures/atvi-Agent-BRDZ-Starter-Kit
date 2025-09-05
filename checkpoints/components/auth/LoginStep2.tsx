//Path: components/auth/LoginStep2.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSDK } from '@/hooks/useSDK';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import DeviceInfo from '@/components/auth/DeviceInfo';
import { Smartphone, CheckCircle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';

type VerificationStatus = 'pending' | 'approved' | 'denied' | 'expired' | 'error';

export default function LoginStep2() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { sdkReady, sdk, updateToken } = useSDK();
  
  const [status, setStatus] = useState<VerificationStatus>('pending');
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session');
  const email = searchParams.get('email');
  const deviceInfoParam = searchParams.get('device_info');

  // Parse device info from URL params
  useEffect(() => {
    if (deviceInfoParam) {
      try {
        setDeviceInfo(JSON.parse(deviceInfoParam));
      } catch (err) {
        console.error('Failed to parse device info:', err);
      }
    }
  }, [deviceInfoParam]);

  // Mobile verification polling with real SDK
  useEffect(() => {
    if (!sdkReady || !sessionId || status !== 'pending') return;

    let pollInterval: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;

    const pollMobileStatus = async () => {
      try {
        setIsPolling(true);
        const response = await sdk.auth.checkMobileLoginStatus(sessionId);
        
        // Handle different possible response structures
        const loginStatus = response.data?.status || response.status;
        const userData = response.data?.user || response.user;
        const token = response.data?.token || response.token;
        
        if (loginStatus === 'approved') {
          setStatus('approved');
          
          if (token && userData) {
            // Set localStorage exactly like backend response
            localStorage.setItem("pending_username", email || '');
            
            if (userData) {
              localStorage.setItem("user_id", userData.user_id || "");
              localStorage.setItem("username", userData.username || "");
              localStorage.setItem("email", userData.email || "");
              localStorage.setItem("phone", userData.phone || "");
              localStorage.setItem("ekyc_status", userData.ekyc_status || "PENDING");
              localStorage.setItem("user", JSON.stringify(userData));
            }
            
            // Handle client data if available
            const clientData = response.data?.client || response.client;
            if (clientData) {
              localStorage.setItem("client_id", clientData.client_id || "");
            }
            
            if (token) {
              localStorage.setItem("token", token);
            }
            
            // Update SDK token and AuthContext
            updateToken(token);
            login(token, userData);
            
            // Redirect based on eKYC status
            const ekycStatus = userData.ekyc_status || 'PENDING';
            if (ekycStatus === 'APPROVED') {
              router.push('/dashboard');
            } else {
              router.push('/ekyc');
            }
          } else {
            setError('Authentication succeeded but user data is missing');
          }
        } else if (loginStatus === 'denied') {
          setStatus('denied');
        } else if (loginStatus === 'expired') {
          setStatus('expired');
        }
        // Continue polling if still pending
        
      } catch (err: any) {
        console.error('Mobile verification polling error:', err);
        setError(err.message || 'Failed to check login status');
        setStatus('error');
      } finally {
        setIsPolling(false);
      }
    };

    // Start polling every 2 seconds
    pollInterval = setInterval(pollMobileStatus, 2000);
    
    // Set timeout for 5 minutes
    timeoutId = setTimeout(() => {
      clearInterval(pollInterval);
      setStatus('expired');
    }, 300000);

    // Initial poll
    pollMobileStatus();

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeoutId);
    };
  }, [sdkReady, sessionId, status, sdk, updateToken, login, router]);

  // Countdown timer
  useEffect(() => {
    if (status === 'pending' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status, timeLeft]);

  // Handle denied or expired status - redirect after delay
  useEffect(() => {
    if (status === 'denied' || status === 'expired' || status === 'error') {
      const redirectTimer = setTimeout(() => {
        router.push('/auth/login');
      }, 3000);

      return () => clearTimeout(redirectTimer);
    }
  }, [status, router]);

  // Redirect if no session ID
  if (!sessionId) {
    router.push('/auth/login');
    return null;
  }

  // Show SDK loading
  if (!sdkReady) {
    return (
      <div className="text-center space-y-4">
        <LoadingSpinner />
        <p className="text-muted-foreground">Initializing secure connection...</p>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-16 w-16 text-secondary" />;
      case 'denied':
        return <XCircle className="h-16 w-16 text-destructive" />;
      case 'expired':
        return <Clock className="h-16 w-16 text-muted-foreground" />;
      case 'error':
        return <XCircle className="h-16 w-16 text-destructive" />;
      default:
        return (
          <div className="relative">
            <Smartphone className="h-16 w-16 text-primary" />
            {isPolling && (
              <div className="absolute -top-1 -right-1">
                <LoadingSpinner size="sm" />
              </div>
            )}
          </div>
        );
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'approved':
        return {
          title: 'Login Approved!',
          subtitle: 'Redirecting to your dashboard...',
          className: 'text-secondary'
        };
      case 'denied':
        return {
          title: 'Login Denied',
          subtitle: 'The login request was denied on your mobile device',
          className: 'text-destructive'
        };
      case 'expired':
        return {
          title: 'Session Expired',
          subtitle: 'The login request has timed out',
          className: 'text-muted-foreground'
        };
      case 'error':
        return {
          title: 'Verification Error',
          subtitle: error || 'An error occurred while verifying your login',
          className: 'text-destructive'
        };
      default:
        return {
          title: 'Approve login using ABSK mobile app',
          subtitle: `Logging in as ${email}`,
          className: 'text-foreground'
        };
    }
  };

  const statusMsg = getStatusMessage();

  return (
    <div className="space-y-8 text-center">
      {/* Status Icon */}
      <div className="flex justify-center">
        {getStatusIcon()}
      </div>

      {/* Status Message */}
      <div className="space-y-2">
        <h2 className={`text-2xl font-bold ${statusMsg.className}`}>
          {statusMsg.title}
        </h2>
        <p className="text-muted-foreground">
          {statusMsg.subtitle}
        </p>
      </div>

      {/* Loading indicator for pending status */}
      {status === 'pending' && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-muted-foreground">
              Awaiting Mobile Confirmation
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Session expires in {formatTime(timeLeft)}
          </p>
        </div>
      )}

      {/* Device Information */}
      {deviceInfo && (
        <DeviceInfo 
          deviceInfo={deviceInfo} 
          loading={false} 
          error={null} 
        />
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {status === 'pending' && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/auth/login')}
          >
            Try Different Method
          </Button>
        )}

        {(status === 'denied' || status === 'expired' || status === 'error') && (
          <Button
            className="w-full gradient-primary text-white border-0"
            onClick={() => router.push('/auth/login')}
          >
            Try Again
          </Button>
        )}
      </div>

      {status === 'pending' && (
        <p className="text-xs text-muted-foreground">
          Check your mobile device for the login request notification
        </p>
      )}

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-muted/50 rounded text-xs text-muted-foreground text-left">
          <p>Session ID: {sessionId}</p>
          <p>Status: {status}</p>
          <p>Polling: {isPolling ? '🔄' : '⏸️'}</p>
          <p>SDK Ready: {sdkReady ? '✅' : '❌'}</p>
        </div>
      )}
    </div>
  );
}