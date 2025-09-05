//Path: components/auth/LoginStep1.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useSDK } from '@/hooks/useSDK';
import Link from 'next/link';

export default function LoginStep1() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { sdkReady, sdk, error: sdkError } = useSDK();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!sdkReady) {
      setError('SDK not ready. Please try again in a moment.');
      setIsLoading(false);
      return;
    }

    try {
      // Use real BRDZ SDK
      const response = await sdk.auth.initiateMobileLogin(emailOrUsername);
      
      // Check response structure from SDK documentation
      const sessionId = response.data?.sessionId || response.sessionId || response.session_id;
      const deviceInfo = response.data?.device_info || response.device_info;
      
      if (!sessionId) {
        throw new Error('No session ID received from server');
      }
      
      // Navigate to verification page with session data
      const params = new URLSearchParams({
        session: sessionId,
        email: emailOrUsername,
      });
      
      // Pass device info if available
      if (deviceInfo) {
        params.set('device_info', JSON.stringify(deviceInfo));
      }
      
      router.push(`/auth/verify?${params.toString()}`);
      
    } catch (err: any) {
      console.error('Mobile login initiation failed:', err);
      
      // Handle different error types
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show SDK initialization error
  if (sdkError) {
    return (
      <div className="text-center space-y-4">
        <div className="bg-red-600 text-white p-6 rounded-lg shadow-lg border border-red-700">
          <div className="flex items-center justify-center mb-3">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-lg">!</span>
            </div>
            <h3 className="text-xl font-bold">SDK Initialization Failed</h3>
          </div>
          <p className="text-lg mb-4">{sdkError}</p>
          <p className="text-red-100 text-sm">
            Please check your environment configuration and restart the application.
          </p>
        </div>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          className="w-full bg-white text-red-600 border-red-600 hover:bg-red-50"
        >
          Reload Page
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">Email or Username</Label>
        <Input
          id="email"
          type="text"
          placeholder="Enter your email or username"
          value={emailOrUsername}
          onChange={(e) => setEmailOrUsername(e.target.value)}
          required
          disabled={isLoading || !sdkReady}
          className="h-12"
        />
        {!sdkReady && (
          <p className="text-xs text-muted-foreground">
            Initializing secure connection...
          </p>
        )}
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-12 gradient-primary text-white border-0 security-glow"
        disabled={isLoading || !emailOrUsername.trim() || !sdkReady}
      >
        {isLoading ? (
          <>
            <LoadingSpinner className="mr-2" />
            Sending Mobile Request...
          </>
        ) : !sdkReady ? (
          <>
            <LoadingSpinner className="mr-2" />
            Initializing...
          </>
        ) : (
          'Continue'
        )}
      </Button>

      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/auth/register" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </p>
        <p className="text-sm text-muted-foreground">
          <Link href="/auth/forgot-password" className="text-primary hover:underline">
            Forgot your credentials?
          </Link>
        </p>
      </div>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
          <p>SDK Ready: {sdkReady ? '✅' : '❌'}</p>
          <p>API Base: {process.env.NEXT_PUBLIC_BRDZ_API_BASE}</p>
          <p>API Key: {process.env.NEXT_PUBLIC_BRDZ_API_KEY ? '✅ Set' : '❌ Missing'}</p>
        </div>
      )}
    </form>
  );
}