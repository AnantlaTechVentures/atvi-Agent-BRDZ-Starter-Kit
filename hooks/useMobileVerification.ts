'use client';

// Temporarily disabled due to missing service
// import { useState, useEffect } from 'react';
// import { ABSK, MobileStatusResponse } from '@/services/absk';

export function useMobileVerification(sessionId: string | null) {
  // Hook temporarily disabled
  return {
    status: 'pending' as const,
    deviceInfo: null,
    isPolling: false
  };
  
  // Original implementation commented out
  /*
  const [status, setStatus] = useState<'pending' | 'approved' | 'denied' | 'expired'>('pending');
  const [deviceInfo, setDeviceInfo] = useState<MobileStatusResponse['device_info'] | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    setIsPolling(true);

    const pollStatus = async () => {
      try {
        const result = await ABSK.auth.checkMobileLoginStatus(sessionId);
        setStatus(result.status);
        setDeviceInfo(result.device_info);

        if (result.status === 'approved' && result.token && result.user) {
          // Handle successful authentication
          setIsPolling(false);
          return { token: result.token, user: result.user };
        } else if (result.status === 'denied' || result.status === 'expired') {
          setIsPolling(false);
        }
      } catch (error) {
        console.error('Status check failed:', error);
      }
      return null;
    };

    // Initial check
    pollStatus().then(result => {
      if (result) {
        // Auth success will be handled by parent component
        return;
      }
    });

    // Poll every 2 seconds
    const interval = setInterval(async () => {
      const result = await pollStatus();
      if (result || status === 'denied' || status === 'expired') {
        clearInterval(interval);
      }
    }, 2000);

    // Timeout after 5 minutes
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setStatus('expired');
      setIsPolling(false);
    }, 300000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      setIsPolling(false);
    };
  }, [sessionId]);

  return { status, deviceInfo, isPolling };
  */
}