//Path: components/ekyc/EkycVerification.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useSDK } from '@/hooks/useSDK';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import EkycStatus from '@/components/ekyc/EkycStatus';
import { FileCheck, Shield, Clock, XCircle, CheckCircle, AlertCircle } from 'lucide-react';

export default function EkycVerification() {
  const [ekycStatus, setEkycStatus] = useState('PENDING');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showManualSync, setShowManualSync] = useState(false);
  const [error, setError] = useState('');
  const [manualSyncData, setManualSyncData] = useState<{
    reviewStatus: string | null;
    reviewAnswer: string | null;
  }>({
    reviewStatus: null,
    reviewAnswer: null,
  });
  
  const { sdkReady, sdk, isAuthenticated, user } = useSDK();
  const { updateEkycStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    checkEkycStatus();
  }, [sdkReady, isAuthenticated]);

  useEffect(() => {
    // Redirect if already approved
    if (ekycStatus === 'APPROVED') {
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    }
  }, [ekycStatus, router]);

  const checkEkycStatus = async () => {
    if (!sdkReady || !isAuthenticated || !user?.user_id) return;

    try {
      // Add user_id parameter as required by TypeScript definition
      const statusData = await sdk.ekyc.getEkycStatus(user.user_id);
      
      if (statusData?.ekyc_status === "APPROVED") {
        setEkycStatus("APPROVED");
        localStorage.setItem("ekyc_status", "APPROVED");
        updateEkycStatus("APPROVED");
        return;
      }
    } catch (err) {
      console.warn("Failed to fetch eKYC status:", err);
    }

    // Fallback to localStorage
    const localStatus = localStorage.getItem('ekyc_status') || 'PENDING';
    setEkycStatus(localStatus);
  };

  const handleManualSync = async () => {
    const applicantId = localStorage.getItem("sumsub_applicant_id");
    const userId = localStorage.getItem("user_id");

    if (!applicantId || !userId || !manualSyncData.reviewStatus || !manualSyncData.reviewAnswer) {
      setError("Unable to sync. Missing verification data. Please complete the verification process.");
      return;
    }

    try {
      setIsLoading(true);
      
      const payload = {
        applicantId,
        user_id: userId,
        reviewStatus: manualSyncData.reviewStatus,
        reviewAnswer: manualSyncData.reviewAnswer,
      };

      const result = await sdk.ekyc.syncSumsubStatus(payload);
      console.log("Manual Sync Result:", result);
      
      // Update status
      setEkycStatus("APPROVED");
      localStorage.setItem("ekyc_status", "APPROVED");
      updateEkycStatus("APPROVED");
      
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
      
    } catch (err: any) {
      console.error("Manual sync error:", err);
      setError("Manual sync failed. Please contact support or try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Sumsub (same as your React version)
  useEffect(() => {
    let sdkScript: HTMLScriptElement;

    const initSumsub = async () => {
      const userId = localStorage.getItem("user_id");
      if (!userId || !sdkReady || ekycStatus === 'APPROVED') {
        return;
      }

      try {
        console.log("🚀 Initializing Sumsub SDK...");
        
        // Use the same method as React version (no params)
        const tokenData = await sdk.ekyc.generateSumsubToken();
        const accessToken = tokenData.token;

        if (!accessToken) {
          throw new Error("No access token received");
        }

        const email = user?.email || localStorage.getItem("email") || "demo@brdz.link";
        const phone = localStorage.getItem("phone") || "+62800000000";

        // Load Sumsub SDK script
        sdkScript = document.createElement("script");
        sdkScript.src = "https://static.sumsub.com/idensic/static/sns-websdk-builder.js";
        sdkScript.async = true;

        sdkScript.onload = () => {
          console.log("✅ Sumsub SDK script loaded");
          
          // @ts-ignore
          const snsWebSdkInstance = window.snsWebSdk
            .init(accessToken, async () => {
              // Token refresh callback
              try {
                const refreshTokenData = await sdk.ekyc.generateSumsubToken();
                return refreshTokenData.token;
              } catch (error) {
                console.error("Error refreshing Sumsub token:", error);
                throw error;
              }
            })
            .withConf({ lang: "en", email, phone })
            .withOptions({ addViewportTag: false, adaptIframeHeight: true })
            .on("idCheck.onApplicantLoaded", (payload: any) => {
              if (payload.applicantId) {
                localStorage.setItem("sumsub_applicant_id", payload.applicantId);
                console.log("💾 Applicant ID loaded:", payload.applicantId);
              }
            })
            .on("idCheck.onApplicantStatusChanged", (payload: any) => {
              console.log("🔄 Sumsub Status Changed:", payload);

              setManualSyncData({
                reviewStatus: payload.reviewStatus || null,
                reviewAnswer: payload.reviewResult?.reviewAnswer || null,
              });

              // Show manual sync when verification completed  
              if (payload.reviewStatus === "completed") {
                console.log("✅ Verification completed, showing manual sync...");
                setIsVerified(true);
                setShowManualSync(true);
              }
            })
            .on("idCheck.onError", (error: any) => {
              console.error("❌ Sumsub SDK Error:", error);
              setError("Verification system error. Please refresh the page and try again.");
            })
            .build();

          snsWebSdkInstance.launch("#sumsub-container");
          console.log("🎯 Sumsub SDK launched in container");
        };

        sdkScript.onerror = () => {
          setError("Failed to load verification system. Please check your internet connection.");
        };

        document.body.appendChild(sdkScript);
        
      } catch (error: any) {
        console.error("❌ Failed to initialize eKYC:", error);
        setError(`Unable to initialize verification system: ${error.message}`);
      }
    };

    if (sdkReady && ekycStatus !== 'APPROVED') {
      initSumsub();
    }

    return () => {
      if (sdkScript && document.body.contains(sdkScript)) {
        document.body.removeChild(sdkScript);
      }
    };
  }, [sdkReady, ekycStatus, user]);

  // Show loading if SDK not ready
  if (!sdkReady) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <LoadingSpinner />
          <p className="text-muted-foreground">Initializing verification system...</p>
        </div>
      </div>
    );
  }

  if (ekycStatus === 'APPROVED') {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-secondary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-secondary">Verification Complete!</h2>
          <p className="text-muted-foreground">Your identity has been successfully verified</p>
        </div>
        <Button
          className="w-full h-12 gradient-primary text-white border-0"
          onClick={() => router.push('/dashboard')}
        >
          Continue to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Display */}
      <EkycStatus showActions={false} />

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <p className="text-destructive text-sm font-medium">Verification Error</p>
            <p className="text-destructive text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Sumsub Container */}
      <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
        <div 
          id="sumsub-container" 
          style={{ width: "100%", minHeight: "600px" }}
          className="flex items-center justify-center"
        >
          {!error && (
            <div className="text-center p-8">
              <LoadingSpinner size="lg" />
              <p className="text-muted-foreground mt-4">Loading verification system...</p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Sync Button */}
      {showManualSync && isVerified && manualSyncData.reviewStatus === "completed" && (
        <div className="text-center space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-left">
                <p className="text-yellow-800 text-sm font-medium">Verification completed successfully!</p>
                <p className="text-yellow-700 text-xs mt-1">Click below to complete the process</p>
              </div>
            </div>
          </div>
          
          <Button
            onClick={handleManualSync}
            disabled={isLoading}
            className="w-full gradient-primary text-white border-0"
          >
            {isLoading ? (
              <>
                <LoadingSpinner className="mr-2" />
                Syncing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Verification
              </>
            )}
          </Button>
        </div>
      )}

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
          <p>eKYC Status: {ekycStatus}</p>
          <p>Is Verified: {isVerified ? '✅' : '❌'}</p>
          <p>Show Manual Sync: {showManualSync ? '✅' : '❌'}</p>
          <p>Manual Sync Data: {JSON.stringify(manualSyncData)}</p>
        </div>
      )}
    </div>
  );
}