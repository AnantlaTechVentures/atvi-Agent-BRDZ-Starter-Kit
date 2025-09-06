'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSDK } from '@/hooks/useSDK';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  User, 
  DollarSign,
  Save,
  AlertCircle,
  CheckCircle,
  Info,
  Shield
} from 'lucide-react';

interface PlatformFeeSettings {
  platform_fee_percentage: number;
  minimum_platform_fee_usd: number;
  gas_price_multiplier: number;
  updated_at?: string;
  updated_by_admin_id?: string;
}

interface UpdateResult {
  success: boolean;
  message: string;
  error?: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { sdk, canMakeRequests } = useSDK();
  
  const [platformFeeSettings, setPlatformFeeSettings] = useState<PlatformFeeSettings | null>(null);
  const [isLoadingFees, setIsLoadingFees] = useState(false);
  const [isSavingFees, setIsSavingFees] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null);
  
  // Form states for fee settings
  const [feePercentage, setFeePercentage] = useState<string>('');
  const [minimumFee, setMinimumFee] = useState<string>('');
  const [gasMultiplier, setGasMultiplier] = useState<string>('');
  
  const [activeTab, setActiveTab] = useState<'profile' | 'fees'>('profile');
  const isAdmin = (user as any)?.role === 'admin';

  useEffect(() => {
    if (canMakeRequests && isAdmin) {
      loadPlatformFeeSettings();
    }
  }, [canMakeRequests, isAdmin]);

  const loadPlatformFeeSettings = async () => {
    if (!canMakeRequests) return;
    
    setIsLoadingFees(true);
    try {
      const response = await sdk.onchain.admin.getFeeSettings();
      console.log('Fee settings response:', response);
      
      if (response?.success && response?.data?.platform_fee_settings) {
        const settings = response.data.platform_fee_settings;
        setPlatformFeeSettings(settings);
        
        // Set form values
        setFeePercentage(settings.platform_fee_percentage.toString());
        setMinimumFee(settings.minimum_platform_fee_usd.toString());
        setGasMultiplier(settings.gas_price_multiplier.toString());
      }
    } catch (error) {
      console.error('Failed to load platform fee settings:', error);
    } finally {
      setIsLoadingFees(false);
    }
  };

  const validateFeeSettings = () => {
    const errors: string[] = [];
    
    const percentage = parseFloat(feePercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 10) {
      errors.push('Platform fee percentage must be between 0% and 10%');
    }
    
    const minimum = parseFloat(minimumFee);
    if (isNaN(minimum) || minimum < 0 || minimum > 100) {
      errors.push('Minimum platform fee must be between $0 and $100');
    }
    
    const multiplier = parseFloat(gasMultiplier);
    if (isNaN(multiplier) || multiplier < 1 || multiplier > 3) {
      errors.push('Gas price multiplier must be between 1.0 and 3.0');
    }
    
    return errors;
  };

  const handleSaveFeeSettings = async () => {
    if (!canMakeRequests || !isAdmin) return;
    
    const validationErrors = validateFeeSettings();
    if (validationErrors.length > 0) {
      setUpdateResult({
        success: false,
        message: 'Validation failed',
        error: validationErrors.join('. ')
      });
      return;
    }
    
    setIsSavingFees(true);
    setUpdateResult(null);
    
    try {
      const response = await sdk.onchain.admin.updateFeeSettings({
        platform_fee_percentage: parseFloat(feePercentage),
        minimum_platform_fee_usd: parseFloat(minimumFee),
        gas_price_multiplier: parseFloat(gasMultiplier)
      });
      
      if (response?.success) {
        setUpdateResult({
          success: true,
          message: 'Platform fee settings updated successfully'
        });
        
        // Reload settings to get updated timestamp
        await loadPlatformFeeSettings();
      } else {
        setUpdateResult({
          success: false,
          message: 'Failed to update fee settings',
          error: response?.error?.message || 'Unknown error'
        });
      }
    } catch (error: any) {
      setUpdateResult({
        success: false,
        message: 'Failed to update fee settings',
        error: error.message || 'Network error'
      });
    } finally {
      setIsSavingFees(false);
    }
  };

  const resetFeeSettings = () => {
    if (platformFeeSettings) {
      setFeePercentage(platformFeeSettings.platform_fee_percentage.toString());
      setMinimumFee(platformFeeSettings.minimum_platform_fee_usd.toString());
      setGasMultiplier(platformFeeSettings.gas_price_multiplier.toString());
    }
    setUpdateResult(null);
  };

  const hasUnsavedChanges = () => {
    if (!platformFeeSettings) return false;
    
    return (
      parseFloat(feePercentage) !== platformFeeSettings.platform_fee_percentage ||
      parseFloat(minimumFee) !== platformFeeSettings.minimum_platform_fee_usd ||
      parseFloat(gasMultiplier) !== platformFeeSettings.gas_price_multiplier
    );
  };

  return (
    <ProtectedLayout>
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="h-6 w-6" />
                Settings
                </h1>
                <p className="text-muted-foreground">
                Manage your profile and platform configuration
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'profile' | 'fees')} className="space-y-4">
                <TabsList>
                <TabsTrigger value="profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                </TabsTrigger>
                {isAdmin && (
                    <TabsTrigger value="fees" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Platform Fees
                    {hasUnsavedChanges() && (
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    )}
                    </TabsTrigger>
                )}
                </TabsList>

                {/* Profile Tab - Using AuthContext Data Only */}
                <TabsContent value="profile">
                <Card>
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        User Profile
                    </CardTitle>
                    <CardDescription>
                        Your account information from current session
                    </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                    {user ? (
                        <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                            <Label className="text-sm font-medium text-muted-foreground">User ID</Label>
                            <div className="p-3 bg-muted rounded-lg font-mono text-sm">
                                {user.user_id}
                            </div>
                            </div>
                            
                            <div className="space-y-2">
                            <Label className="text-sm font-medium text-muted-foreground">Username</Label>
                            <div className="p-3 bg-muted rounded-lg">
                                {(user as any).username || user.email?.split('@')[0] || 'N/A'}
                            </div>
                            </div>
                            
                            <div className="space-y-2">
                            <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                            <div className="p-3 bg-muted rounded-lg">
                                {user.email || 'N/A'}
                            </div>
                            </div>
                            
                            <div className="space-y-2">
                            <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                            <div className="p-3 bg-muted rounded-lg">
                                <Badge variant={(user as any).role === 'admin' ? 'default' : 'secondary'}>
                                {(user as any).role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                                {((user as any).role || 'user').toUpperCase()}
                                </Badge>
                            </div>
                            </div>
                            
                            <div className="space-y-2">
                            <Label className="text-sm font-medium text-muted-foreground">Session Started</Label>
                            <div className="p-3 bg-muted rounded-lg">
                                {new Date().toLocaleDateString()}
                            </div>
                            </div>
                            
                            <div className="space-y-2">
                            <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                            <div className="p-3 bg-muted rounded-lg">
                                <Badge variant="default" className="bg-green-500">
                                Active
                                </Badge>
                            </div>
                            </div>
                        </div>
                        
                        {!isAdmin && (
                            <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                Contact an administrator to modify your profile information
                            </AlertDescription>
                            </Alert>
                        )}
                        </div>
                    ) : (
                        <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            No user session found. Please log in again.
                        </AlertDescription>
                        </Alert>
                    )}
                    </CardContent>
                </Card>
                </TabsContent>

                {/* Platform Fees Tab - Using SDK */}
                {isAdmin && (
                <TabsContent value="fees">
                    <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Platform Fee Settings
                        </CardTitle>
                        <CardDescription>
                        Configure fees for onchain transactions
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                        {isLoadingFees ? (
                        <div className="flex items-center justify-center py-8">
                            <LoadingSpinner size="lg" />
                        </div>
                        ) : (
                        <div className="space-y-6">
                            {/* Update Result Alert */}
                            {updateResult && (
                            <Alert variant={updateResult.success ? "default" : "destructive"}>
                                {updateResult.success ? (
                                <CheckCircle className="h-4 w-4" />
                                ) : (
                                <AlertCircle className="h-4 w-4" />
                                )}
                                <AlertDescription>
                                {updateResult.message}
                                {updateResult.error && `: ${updateResult.error}`}
                                </AlertDescription>
                            </Alert>
                            )}
                            
                            {/* Fee Settings Form */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="feePercentage">Platform Fee Percentage</Label>
                                <div className="relative">
                                <Input
                                    id="feePercentage"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="10"
                                    value={feePercentage}
                                    onChange={(e) => setFeePercentage(e.target.value)}
                                    placeholder="0.50"
                                />
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <span className="text-sm text-muted-foreground">%</span>
                                </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                Percentage fee charged on transaction amount
                                </p>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="minimumFee">Minimum Platform Fee</Label>
                                <div className="relative">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                    <span className="text-sm text-muted-foreground">$</span>
                                </div>
                                <Input
                                    id="minimumFee"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={minimumFee}
                                    onChange={(e) => setMinimumFee(e.target.value)}
                                    placeholder="0.10"
                                    className="pl-8"
                                />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                Minimum fee charged regardless of amount
                                </p>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="gasMultiplier">Gas Price Multiplier</Label>
                                <div className="relative">
                                <Input
                                    id="gasMultiplier"
                                    type="number"
                                    step="0.1"
                                    min="1"
                                    max="3"
                                    value={gasMultiplier}
                                    onChange={(e) => setGasMultiplier(e.target.value)}
                                    placeholder="1.2"
                                />
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <span className="text-sm text-muted-foreground">×</span>
                                </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                Gas price safety buffer multiplier
                                </p>
                            </div>
                            </div>
                            
                            {/* Current Settings Display */}
                            {platformFeeSettings && (
                            <div className="p-4 bg-muted rounded-lg">
                                <h4 className="text-sm font-medium mb-2">Current Active Settings:</h4>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Fee:</span>
                                    <span className="ml-2 font-medium">{platformFeeSettings.platform_fee_percentage}%</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Min:</span>
                                    <span className="ml-2 font-medium">${platformFeeSettings.minimum_platform_fee_usd}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Gas:</span>
                                    <span className="ml-2 font-medium">{platformFeeSettings.gas_price_multiplier}×</span>
                                </div>
                                </div>
                                {platformFeeSettings.updated_at && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    Last updated: {new Date(platformFeeSettings.updated_at).toLocaleString()}
                                </p>
                                )}
                            </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="flex gap-3">
                            <Button
                                onClick={handleSaveFeeSettings}
                                disabled={isSavingFees || !hasUnsavedChanges()}
                                className="flex-1"
                            >
                                {isSavingFees ? (
                                <>
                                    <LoadingSpinner size="sm" className="mr-2" />
                                    Saving...
                                </>
                                ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Changes
                                </>
                                )}
                            </Button>
                            
                            <Button
                                variant="outline"
                                onClick={resetFeeSettings}
                                disabled={isSavingFees || !hasUnsavedChanges()}
                            >
                                Reset
                            </Button>
                            </div>
                            
                            {/* Fee Impact Preview */}
                            <div className="border rounded-lg p-4">
                            <h4 className="text-sm font-medium mb-3">Fee Impact Examples:</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                <span>Transfer $10 USDC:</span>
                                <span className="font-medium">
                                    ${Math.max((10 * parseFloat(feePercentage || '0')) / 100, parseFloat(minimumFee || '0')).toFixed(2)} fee
                                </span>
                                </div>
                                <div className="flex justify-between">
                                <span>Transfer $100 USDC:</span>
                                <span className="font-medium">
                                    ${Math.max((100 * parseFloat(feePercentage || '0')) / 100, parseFloat(minimumFee || '0')).toFixed(2)} fee
                                </span>
                                </div>
                                <div className="flex justify-between">
                                <span>Transfer $1000 USDC:</span>
                                <span className="font-medium">
                                    ${Math.max((1000 * parseFloat(feePercentage || '0')) / 100, parseFloat(minimumFee || '0')).toFixed(2)} fee
                                </span>
                                </div>
                            </div>
                            </div>
                        </div>
                        )}
                    </CardContent>
                    </Card>
                </TabsContent>
                )}
            </Tabs>
        </div>
    </ProtectedLayout>
  );
}