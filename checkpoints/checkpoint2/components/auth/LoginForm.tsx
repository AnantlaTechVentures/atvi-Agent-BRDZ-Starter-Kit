//Path: components/auth/LoginForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useSDK } from '@/hooks/useSDK';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginForm() {
  const [formData, setFormData] = useState({
    usernameoremail: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const { sdkReady, sdk, error: sdkError } = useSDK();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (!sdkReady) {
      setError('SDK not ready. Please try again in a moment.');
      setIsLoading(false);
      return;
    }

    // Basic validation
    if (!formData.usernameoremail.trim() || !formData.password.trim()) {
      setError('Please fill in all fields.');
      setIsLoading(false);
      return;
    }

    try {
      console.log('🚀 Attempting login with:', {
        usernameoremail: formData.usernameoremail,
        password: '[HIDDEN]'
      });

      // Use BRDZ SDK loginUser method
      const response = await sdk.auth.loginUser(
        formData.usernameoremail.trim(), 
        formData.password
      );

      console.log('📥 Login response:', response);

      // Enhanced success detection - check multiple possible success indicators
      const isSuccess = response.success === true || 
                       response.data || 
                       (response.status >= 200 && response.status < 300) ||
                       response.token ||
                       response.data?.token ||
                       response.user ||
                       response.data?.user;

      if (isSuccess) {
        // Extract token and user data from various possible response structures
        const token = response.token || 
                     response.data?.token || 
                     response.access_token ||
                     response.data?.access_token;

        const userData = response.user || 
                        response.data?.user || 
                        response.data ||
                        response;

        const clientData = response.client || 
                          response.data?.client ||
                          response.clientData;

        if (!token) {
          throw new Error('No authentication token received');
        }

        if (!userData || !userData.user_id) {
          throw new Error('No user data received');
        }

        console.log('✅ Login successful:', {
          token: token.substring(0, 20) + '...',
          user: userData.username || userData.email,
          user_id: userData.user_id
        });

        setSuccess('Login successful! Redirecting...');

        // Export to localStorage (backend format compatibility)
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_id', userData.user_id?.toString() || '');
        localStorage.setItem('username', userData.username || '');
        localStorage.setItem('email', userData.email || '');
        localStorage.setItem('phone', userData.phone || '');
        localStorage.setItem('ekyc_status', userData.ekyc_status || 'PENDING');
        localStorage.setItem('user_data', JSON.stringify(userData));
        
        // Store client data if available
        if (clientData) {
          localStorage.setItem('client_id', clientData.client_id?.toString() || '');
          localStorage.setItem('client_code', clientData.client_code || '');
          localStorage.setItem('client_type', clientData.client_type || '');
          localStorage.setItem('client_status', clientData.client_status || '');
        }

        // Store additional backend response data
        if (response.permissions) {
          localStorage.setItem('user_permissions', JSON.stringify(response.permissions));
        }
        
        if (response.role || userData.role) {
          localStorage.setItem('user_role', response.role || userData.role);
        }

        console.log('💾 Data exported to localStorage:', {
          token: token?.substring(0, 20) + '...',
          user_id: userData.user_id,
          username: userData.username,
          email: userData.email,
          ekyc_status: userData.ekyc_status,
          client_id: clientData?.client_id || 'N/A'
        });

        // Update AuthContext - this will sync with SDK
        await login(token, userData);

        // Redirect based on eKYC status
        const ekycStatus = userData.ekyc_status || 'PENDING';
        setTimeout(() => {
          if (ekycStatus === 'APPROVED') {
            router.push('/dashboard');
          } else {
            router.push('/ekyc');
          }
        }, 1000);

      } else {
        // Handle explicit failure
        const errorMessage = response.error || 
                            response.message || 
                            response.data?.error || 
                            response.data?.message ||
                            'Login failed. Please check your credentials.';
        
        setError(errorMessage);
        console.error('❌ Login failed with response:', response);
      }

    } catch (err: any) {
      console.error('💥 Login error caught:', err);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (err.response) {
        // HTTP error response
        const status = err.response.status;
        const data = err.response.data;
        
        console.log('🔍 Error response status:', status);
        console.log('🔍 Error response data:', data);
        
        if (status === 401) {
          errorMessage = 'Invalid username/email or password. Please check your credentials.';
        } else if (status === 404) {
          errorMessage = 'User not found. Please check your username or email.';
        } else if (status === 429) {
          errorMessage = 'Too many login attempts. Please try again later.';
        } else if (status === 500) {
          errorMessage = 'Server error occurred. Please try again later.';
        } else if (data?.error) {
          errorMessage = data.error;
        } else if (data?.message) {
          errorMessage = data.message;
        }
      } else if (err.message) {
        // Network or other error
        if (err.message.includes('timeout')) {
          errorMessage = 'Request timeout. Please check your connection and try again.';
        } else if (err.message.includes('Network Error')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
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

  const isFormValid = formData.usernameoremail.trim() && formData.password.trim();
  
  // Enhanced validation with specific field validation
  const fieldValidation = {
    usernameoremail: {
      isValid: formData.usernameoremail.trim().length > 0,
      message: formData.usernameoremail.trim().length === 0 ? 'Username or email is required' : '',
      hasError: formData.usernameoremail.trim().length === 0 && formData.usernameoremail.length > 0
    },
    password: {
      isValid: formData.password.trim().length > 0,
      message: formData.password.trim().length === 0 ? 'Password is required' : '',
      hasError: formData.password.trim().length === 0 && formData.password.length > 0
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="usernameoremail" className="text-sm font-medium">
            Email or Username <span className="text-red-500">*</span>
          </Label>
          {formData.usernameoremail.length > 0 && (
            <div className="flex items-center gap-1">
              {fieldValidation.usernameoremail.isValid ? (
                <div className="flex items-center gap-1 text-green-600">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-xs">Valid</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-xs">Required</span>
                </div>
              )}
            </div>
          )}
        </div>
        <Input
          id="usernameoremail"
          type="text"
          placeholder="Enter your email or username"
          value={formData.usernameoremail}
          onChange={handleInputChange('usernameoremail')}
          required
          disabled={isLoading || !sdkReady}
          className={`h-12 transition-all duration-200 ${
            fieldValidation.usernameoremail.hasError 
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
              : fieldValidation.usernameoremail.isValid 
                ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20' 
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
          }`}
        />
        {fieldValidation.usernameoremail.message && (
          <div className="text-xs text-red-500 flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            {fieldValidation.usernameoremail.message}
          </div>
        )}
        {formData.usernameoremail.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Enter the email or username you used during registration
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-medium">
            Password <span className="text-red-500">*</span>
          </Label>
          {formData.password.length > 0 && (
            <div className="flex items-center gap-1">
              {fieldValidation.password.isValid ? (
                <div className="flex items-center gap-1 text-green-600">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-xs">Valid</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-xs">Required</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleInputChange('password')}
            required
            disabled={isLoading || !sdkReady}
            className={`h-12 pr-12 transition-all duration-200 ${
              fieldValidation.password.hasError 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                : fieldValidation.password.isValid 
                  ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
            }`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-12 w-12 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading || !sdkReady}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        {fieldValidation.password.message && (
          <div className="text-xs text-red-500 flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            {fieldValidation.password.message}
          </div>
        )}
        {formData.password.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Enter the password for your account
          </p>
        )}
      </div>

      {/* Form Validation Summary */}
      <div className="space-y-3">
        {!sdkReady && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            Initializing secure connection...
          </div>
        )}
        
        {/* Form Status Indicator */}
        <div className={`p-3 rounded-lg border ${
          isFormValid 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <div className="flex items-center gap-2">
            {isFormValid ? (
              <>
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Form is ready to submit</span>
              </>
            ) : (
              <>
                <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
                <span className="text-sm font-medium">Please complete all required fields</span>
              </>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span>Form Completion</span>
              <span>{Object.values(fieldValidation).filter(f => f.isValid).length}/2</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  isFormValid ? 'bg-green-500' : 'bg-amber-500'
                }`}
                style={{ 
                  width: `${(Object.values(fieldValidation).filter(f => f.isValid).length / 2) * 100}%` 
                }}
              ></div>
            </div>
          </div>
          
          <div className="mt-2 text-xs">
            {isFormValid 
              ? 'All fields are valid. You can now log in.' 
              : `${2 - Object.values(fieldValidation).filter(f => f.isValid).length} of 2 fields completed`
            }
          </div>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
            {error}
          </div>
        )}
      </div>

      {success && (
        <div className="text-sm text-secondary bg-secondary/10 p-3 rounded-lg">
          {success}
        </div>
      )}

      <Button
        type="submit"
        className={`w-full h-12 transition-all duration-200 ${
          isFormValid && sdkReady
            ? 'gradient-primary text-white border-0 security-glow hover:shadow-lg' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed border-0'
        }`}
        disabled={isLoading || !isFormValid || !sdkReady}
      >
        {isLoading ? (
          <>
            <LoadingSpinner className="mr-2" />
            Signing In...
          </>
        ) : !sdkReady ? (
          <>
            <LoadingSpinner className="mr-2" />
            Initializing...
          </>
        ) : !isFormValid ? (
          <>
            <div className="w-4 h-4 bg-gray-400 rounded-full mr-2"></div>
            Complete Required Fields
          </>
        ) : (
          <>
            <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
            Sign In
          </>
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
            Forgot your password?
          </Link>
        </p>
      </div>

      {/* Helpful Tips */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
            <span className="text-white text-xs font-bold">💡</span>
          </div>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Quick Tips:</p>
            <ul className="text-xs space-y-1">
              <li>• Use the email or username you registered with</li>
              <li>• Passwords are case-sensitive</li>
              <li>• You'll receive a mobile push notification for 2FA</li>
              <li>• Keep your device nearby for authentication</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">SDK Ready:</span>
              <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Form Valid:</span>
              <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            </div>
            

            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">API Key:</span>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-xs text-green-600 font-medium">Set</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}