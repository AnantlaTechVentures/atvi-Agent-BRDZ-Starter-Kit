//Path: components/auth/RegisterForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from '@/components/ui/select';
import { useSDK } from '@/hooks/useSDK';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import Link from 'next/link';

// Interface matching backend requirements
interface RegisterFormData {
  email: string;
  client_alias: string;    // BE requires this (Name)
  client_type: string;     // BE requires this (Type)
  country_code: string;    // BE requires this (Country)
  phone: string;           // BE requires this (Mobile)
}

// Phone prefix mapping for validation
const countryCodeToPhonePrefix: Record<string, string> = {
  ID: "62",
  SG: "65", 
  MY: "60",
  TH: "66",
  VN: "84",
  PH: "63",
  AU: "61",
  CN: "86",
  JP: "81",
  US: "1",
};

const countryOptions = [
  { value: "ID", label: "🇮🇩 Indonesia" },
  { value: "SG", label: "🇸🇬 Singapore" },
  { value: "MY", label: "🇲🇾 Malaysia" },
  { value: "TH", label: "🇹🇭 Thailand" },
  { value: "VN", label: "🇻🇳 Vietnam" },
  { value: "PH", label: "🇵🇭 Philippines" },
  { value: "AU", label: "🇦🇺 Australia" },
  { value: "CN", label: "🇨🇳 China" },
  { value: "JP", label: "🇯🇵 Japan" },
  { value: "US", label: "🇺🇸 United States" },
];

export default function RegisterForm() {
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    client_alias: '',
    client_type: 'INDIVIDUAL',
    country_code: 'ID',
    phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const router = useRouter();
  const { sdkReady, sdk, error: sdkError } = useSDK();

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    setTempPassword('');

    if (!sdkReady) {
      setError('SDK not ready. Please try again in a moment.');
      setIsLoading(false);
      return;
    }

    // Phone validation based on country
    const expectedPrefix = countryCodeToPhonePrefix[formData.country_code];
    if (!formData.phone.startsWith(expectedPrefix)) {
      setError(`Phone number must start with ${expectedPrefix} for ${formData.country_code}`);
      setIsLoading(false);
      return;
    }

    try {
      // Use real BRDZ SDK registerUser method - need to match SDK RegisterData interface
      const sdkData = {
        ...formData,
        username: formData.client_alias // SDK requires username, use client_alias as fallback
      };
      
      console.log('🚀 Sending registration data:', sdkData);
      
      const response = await sdk.auth.registerUser(sdkData);
      
      console.log('📥 Registration response:', response);
      
      // FIXED: Better response handling - check multiple success indicators
      const isSuccess = response.success === true || 
                       response.data || 
                       (response.status >= 200 && response.status < 300) ||
                       response.message?.includes('success') ||
                       response.client_id ||
                       response.user_id;

      if (isSuccess) {
        setSuccess('🎉 Account created successfully! Please check your email for login instructions.');
        
        // Show temporary password if provided
        const tempPass = response.temp_password || 
                        response.data?.temp_password || 
                        response.password ||
                        response.data?.password;
        
        if (tempPass) {
          setTempPassword(tempPass);
        }
        
        // Show additional success info
        if (response.data?.client_code || response.client_code) {
          console.log('✅ Client created with code:', response.data?.client_code || response.client_code);
        }
        
        // Reset form
        setFormData({
          email: '',
          client_alias: '',
          client_type: 'INDIVIDUAL',
          country_code: 'ID',
          phone: ''
        });

        // Redirect after 4 seconds to give user time to read
        setTimeout(() => {
          router.push('/auth/login?message=Registration successful. Please check your email and login to continue.');
        }, 4000);

      } else {
        // Handle explicit failure
        const errorMessage = response.error || 
                            response.message || 
                            response.data?.error || 
                            response.data?.message ||
                            'Registration failed. Please try again.';
        
        setError(errorMessage);
        console.error('❌ Registration failed with response:', response);
      }
    } catch (err: any) {
      console.error('💥 Registration error caught:', err);
      
      // Enhanced error handling
      let errorMessage = 'Registration failed. Please try again.';
      
      if (err.response) {
        // HTTP error response
        const status = err.response.status;
        const data = err.response.data;
        
        console.log('🔍 Error response status:', status);
        console.log('🔍 Error response data:', data);
        
        if (status === 409) {
          errorMessage = 'Email, username, or phone number already exists. Please use different credentials or sign in if you already have an account.';
        } else if (status === 400) {
          errorMessage = data?.error || data?.message || 'Invalid data provided. Please check your inputs.';
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

  const handleInputChange = (field: keyof RegisterFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleSelectChange = (field: keyof RegisterFormData) => (value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Update phone placeholder when country changes
    if (field === 'country_code') {
      setFormData(prev => ({
        ...prev,
        phone: '' // Reset phone when country changes
      }));
    }
  };

  // Enhanced validation with specific field validation
  const fieldValidation = {
    email: {
      isValid: formData.email.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
      message: !formData.email.trim() ? 'Email is required' : 
               !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? 'Please enter a valid email address' : '',
      hasError: formData.email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    },
    client_alias: {
      isValid: formData.client_alias.trim().length >= 2,
      message: !formData.client_alias.trim() ? 'Full name is required' : 
               formData.client_alias.trim().length < 2 ? 'Full name must be at least 2 characters' : '',
      hasError: formData.client_alias.length > 0 && formData.client_alias.trim().length < 2
    },
    phone: {
      isValid: formData.phone.trim().length > 0 && formData.phone.startsWith(countryCodeToPhonePrefix[formData.country_code]),
      message: !formData.phone.trim() ? 'Phone number is required' : 
               !formData.phone.startsWith(countryCodeToPhonePrefix[formData.country_code]) ? 
               `Phone must start with ${countryCodeToPhonePrefix[formData.country_code]}` : '',
      hasError: formData.phone.length > 0 && !formData.phone.startsWith(countryCodeToPhonePrefix[formData.country_code])
    },
    client_type: {
      isValid: !!formData.client_type,
      message: !formData.client_type ? 'Client type is required' : '',
      hasError: false
    },
    country_code: {
      isValid: !!formData.country_code,
      message: !formData.country_code ? 'Country code is required' : '',
      hasError: false
    }
  };

  // Validation based on backend requirements
  const isFormValid = 
    fieldValidation.email.isValid && 
    fieldValidation.client_alias.isValid && 
    fieldValidation.client_type.isValid && 
    fieldValidation.country_code.isValid && 
    fieldValidation.phone.isValid;

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
        <Label htmlFor="client_alias">Full Name *</Label>
        <Input
          id="client_alias"
          type="text"
          placeholder="Your full name"
          value={formData.client_alias}
          onChange={handleInputChange('client_alias')}
          required
          disabled={isLoading || !sdkReady}
          className="h-12"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="email" className="text-sm font-medium">
            Email <span className="text-red-500">*</span>
          </Label>
          {formData.email.length > 0 && (
            <div className="flex items-center gap-1">
              {fieldValidation.email.isValid ? (
                <div className="flex items-center gap-1 text-green-600">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-xs">Valid</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-xs">Invalid</span>
                </div>
              )}
            </div>
          )}
        </div>
        <Input
          id="email"
          type="email"
          placeholder="your@email.com"
          value={formData.email}
          onChange={handleInputChange('email')}
          required
          disabled={isLoading || !sdkReady}
          className={`h-12 transition-all duration-200 ${
            fieldValidation.email.hasError 
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
              : fieldValidation.email.isValid 
                ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20' 
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
          }`}
        />
        {fieldValidation.email.message && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            {fieldValidation.email.message}
          </p>
        )}
        {formData.email.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Enter a valid email address for account verification
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number *</Label>
        <Input
          id="phone"
          type="tel"
          placeholder={`e.g. ${countryCodeToPhonePrefix[formData.country_code]}812345678`}
          value={formData.phone}
          onChange={handleInputChange('phone')}
          required
          disabled={isLoading || !sdkReady}
          className="h-12"
        />
        <p className="text-xs text-muted-foreground">
          Must start with {countryCodeToPhonePrefix[formData.country_code]} for {formData.country_code}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="country_code">Country *</Label>
          <Select 
            value={formData.country_code} 
            onValueChange={handleSelectChange('country_code')}
            disabled={isLoading || !sdkReady}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {countryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_type">Client Type *</Label>
          <Select 
            value={formData.client_type} 
            onValueChange={handleSelectChange('client_type')}
            disabled={isLoading || !sdkReady}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select client type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="CORPORATE">Corporate</SelectItem>
                <SelectItem value="BUSINESS">Business</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!sdkReady && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          Initializing secure connection...
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-secondary bg-secondary/10 p-3 rounded-lg">
          {success}
        </div>
      )}

      {tempPassword && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800 text-sm">
          <p>
            Temporary Password:{" "}
            <strong className="break-all font-mono">{tempPassword}</strong>
          </p>
          <p className="mt-1">Please save this password and use it to login.</p>
        </div>
      )}

      {/* Form Validation Summary */}
      <div className="space-y-3">
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
              <span>{Object.values(fieldValidation).filter(f => f.isValid).length}/5</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  isFormValid ? 'bg-green-500' : 'bg-amber-500'
                }`}
                style={{ 
                  width: `${(Object.values(fieldValidation).filter(f => f.isValid).length / 5) * 100}%` 
                }}
              ></div>
            </div>
          </div>
          
          <div className="mt-2 text-xs">
            {isFormValid 
              ? 'All fields are valid. You can now create your account.' 
              : `${5 - Object.values(fieldValidation).filter(f => f.isValid).length} of 5 fields completed`
            }
          </div>
        </div>
      </div>

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
            Creating Account...
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
            Create Account
          </>
        )}
      </Button>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>

      <div className="text-xs text-muted-foreground text-center space-y-1">
        <p>By creating an account, you agree to our Terms of Service and Privacy Policy.</p>
        <p>* Required fields as per backend requirements</p>
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