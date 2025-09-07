// Components/ai/ErrorRecovery.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  RefreshCw, 
  HelpCircle, 
  CheckCircle, 
  Clock,
  ArrowRight,
  Shield,
  Zap
} from 'lucide-react';

// Define complexity type
type ComplexityLevel = 'low' | 'medium' | 'high';

interface ErrorRecoveryProps {
  error: string;
  conversationState?: any;
  onRetry: () => void;
  onGetHelp: () => void;
  onFallback: (action: string) => void;
}

interface OnboardingGuidanceProps {
  intentType: string;
  missingInfo?: string;
  onContinue: () => void;
  onSkip: () => void;
  onGetHelp: () => void;
}

export function ErrorRecovery({ 
  error, 
  conversationState, 
  onRetry, 
  onGetHelp, 
  onFallback 
}: ErrorRecoveryProps) {
  const [showDetailedHelp, setShowDetailedHelp] = useState(false);

  const getErrorType = () => {
    if (error.includes('SDK') || error.includes('initialization')) return 'sdk';
    if (error.includes('AI') || error.includes('service')) return 'ai_service';
    if (error.includes('network') || error.includes('timeout')) return 'network';
    if (error.includes('authentication') || error.includes('token')) return 'auth';
    if (error.includes('validation') || error.includes('parameter')) return 'validation';
    return 'unknown';
  };

  const getRecoveryActions = () => {
    const errorType = getErrorType();
    
    switch (errorType) {
      case 'sdk':
        return [
          { label: 'Refresh Page', action: 'refresh_page', icon: RefreshCw },
          { label: 'Check Connection', action: 'test_connection', icon: Zap },
          { label: 'Manual Operations', action: 'manual_mode', icon: Shield }
        ];
      case 'ai_service':
        return [
          { label: 'Retry AI Request', action: 'retry_ai', icon: RefreshCw },
          { label: 'Use Manual Mode', action: 'manual_mode', icon: Shield },
          { label: 'Simple Commands', action: 'simple_mode', icon: CheckCircle }
        ];
      case 'network':
        return [
          { label: 'Retry Connection', action: 'retry_network', icon: RefreshCw },
          { label: 'Check Network', action: 'check_network', icon: Zap },
          { label: 'Offline Mode', action: 'offline_mode', icon: Shield }
        ];
      case 'auth':
        return [
          { label: 'Re-authenticate', action: 'reauth', icon: Shield },
          { label: 'Check Login', action: 'check_auth', icon: CheckCircle },
          { label: 'Login Again', action: 'login_again', icon: ArrowRight }
        ];
      case 'validation':
        return [
          { label: 'Fix Input', action: 'fix_input', icon: CheckCircle },
          { label: 'Get Examples', action: 'show_examples', icon: HelpCircle },
          { label: 'Start Over', action: 'start_over', icon: RefreshCw }
        ];
      default:
        return [
          { label: 'Try Again', action: 'retry', icon: RefreshCw },
          { label: 'Get Help', action: 'help', icon: HelpCircle },
          { label: 'Manual Mode', action: 'manual_mode', icon: Shield }
        ];
    }
  };

  const getErrorMessage = () => {
    const errorType = getErrorType();
    
    switch (errorType) {
      case 'sdk':
        return {
          title: 'SDK Connection Issue',
          description: 'There\'s a problem with the blockchain connection.',
          suggestion: 'Try refreshing the page or check your internet connection.'
        };
      case 'ai_service':
        return {
          title: 'AI Service Unavailable',
          description: 'The AI assistant is temporarily unavailable.',
          suggestion: 'You can still use manual wallet operations or try again in a moment.'
        };
      case 'network':
        return {
          title: 'Network Connection Problem',
          description: 'Unable to connect to blockchain networks.',
          suggestion: 'Check your internet connection and try again.'
        };
      case 'auth':
        return {
          title: 'Authentication Required',
          description: 'Your session may have expired.',
          suggestion: 'Please log in again to continue.'
        };
      case 'validation':
        return {
          title: 'Input Validation Error',
          description: 'There\'s an issue with the information provided.',
          suggestion: 'Please check your input and try again.'
        };
      default:
        return {
          title: 'Something Went Wrong',
          description: 'An unexpected error occurred.',
          suggestion: 'Try again or contact support if the problem persists.'
        };
    }
  };

  const recoveryActions = getRecoveryActions();
  const errorInfo = getErrorMessage();

  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          
          <div className="flex-1 space-y-3">
            <div>
              <h4 className="font-medium text-red-900">{errorInfo.title}</h4>
              <p className="text-sm text-red-700 mt-1">{errorInfo.description}</p>
              <p className="text-xs text-red-600 mt-1">{errorInfo.suggestion}</p>
            </div>

            {/* Recovery Actions */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-900">Quick Recovery:</p>
              <div className="flex flex-wrap gap-2">
                {recoveryActions.map((action, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="outline"
                    onClick={() => onFallback(action.action)}
                    className="text-xs h-8 border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <action.icon className="h-3 w-3 mr-1" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Detailed Help */}
            <div className="space-y-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDetailedHelp(!showDetailedHelp)}
                className="text-xs text-red-700 hover:text-red-900 p-0 h-auto"
              >
                {showDetailedHelp ? 'Hide' : 'Show'} detailed help
              </Button>

              {showDetailedHelp && (
                <Card className="bg-white border-red-200">
                  <CardContent className="p-3">
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-medium">Error Details:</span>
                        <p className="text-muted-foreground mt-1">{error}</p>
                      </div>
                      
                      {conversationState?.currentIntent && (
                        <div>
                          <span className="font-medium">Current Operation:</span>
                          <p className="text-muted-foreground mt-1">
                            {conversationState.currentIntent.replace('_', ' ').toLowerCase()}
                          </p>
                        </div>
                      )}

                      <div>
                        <span className="font-medium">What you can do:</span>
                        <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                          <li>Wait a moment and try the same request again</li>
                          <li>Use simpler commands like "check balance" or "show wallets"</li>
                          <li>Navigate to manual wallet operations</li>
                          <li>Contact support if the issue persists</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function OnboardingGuidance({ 
  intentType, 
  missingInfo, 
  onContinue, 
  onSkip, 
  onGetHelp 
}: OnboardingGuidanceProps) {
  const getGuidanceContent = (): {
    title: string;
    steps: string[];
    warning: string;
    complexity: ComplexityLevel;
  } => {
    switch (intentType) {
      case 'SEND_ONCHAIN':
        return {
          title: 'Sending USDC Tokens',
          steps: [
            'I\'ll help you send USDC tokens to another address safely',
            'First, I\'ll need to know which wallet to use',
            'Then, I\'ll ask for the recipient address',
            'Finally, you\'ll confirm the transaction details before sending'
          ],
          warning: 'Blockchain transactions are irreversible. Double-check all details.',
          complexity: 'medium'
        };
      case 'SEND_CROSSCHAIN':
        return {
          title: 'Cross-Chain Bridge Transfer',
          steps: [
            'Cross-chain transfers move tokens between different blockchains',
            'This involves two transactions: burn on source chain, mint on destination',
            'I\'ll guide you through each step with confirmations',
            'The process may take a few minutes to complete'
          ],
          warning: 'Cross-chain operations are complex. Follow each step carefully.',
          complexity: 'high'
        };
      case 'CREATE_WALLET':
        return {
          title: 'Creating a New Wallet',
          steps: [
            'I\'ll create a new multi-chain wallet for you',
            'You can add addresses for different blockchains',
            'Each wallet gets a unique ID and name',
            'Your private keys are encrypted and stored securely'
          ],
          warning: 'Keep your wallet information secure and backed up.',
          complexity: 'low'
        };
      default:
        return {
          title: 'Blockchain Operation',
          steps: [
            'I\'ll guide you through this blockchain operation',
            'Each step will be explained clearly',
            'You can ask questions at any time',
            'All transactions require your confirmation'
          ],
          warning: 'Always verify details before confirming operations.',
          complexity: 'medium'
        };
    }
  };

  const guidance = getGuidanceContent();

  // Fixed: Use function instead of dynamic template literals
  const getComplexityBadgeClasses = (complexity: ComplexityLevel): string => {
    switch (complexity) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-blue-900">{guidance.title}</h4>
                <Badge 
                  variant="secondary" 
                  className={getComplexityBadgeClasses(guidance.complexity)}
                >
                  {guidance.complexity} complexity
                </Badge>
              </div>
              
              <p className="text-sm text-blue-700 mb-3">
                Let me walk you through this process:
              </p>

              <div className="space-y-2">
                {guidance.steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Badge variant="outline" className="text-xs w-6 h-6 rounded-full flex items-center justify-center border-blue-300 text-blue-700">
                      {index + 1}
                    </Badge>
                    <p className="text-sm text-blue-800">{step}</p>
                  </div>
                ))}
              </div>

              <Alert className="mt-3 border-orange-200 bg-orange-50">
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-sm text-orange-800">
                  <strong>Important:</strong> {guidance.warning}
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onContinue}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              I understand, continue
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onGetHelp}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <HelpCircle className="h-3 w-3 mr-1" />
              I need more help
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onSkip}
              className="text-blue-600 hover:text-blue-800"
            >
              Skip guidance
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Components/ai/ConversationFlowManager.tsx
interface ConversationFlowManagerProps {
  conversationState: any;
  error?: string;
  onErrorRecovery: (action: string) => void;
  onContinueOnboarding: () => void;
  onSkipOnboarding: () => void;
  onGetHelp: () => void;
}

export function ConversationFlowManager({
  conversationState,
  error,
  onErrorRecovery,
  onContinueOnboarding,
  onSkipOnboarding,
  onGetHelp
}: ConversationFlowManagerProps) {
  // Show error recovery if there's an error
  if (error) {
    return (
      <ErrorRecovery
        error={error}
        conversationState={conversationState}
        onRetry={() => onErrorRecovery('retry')}
        onGetHelp={onGetHelp}
        onFallback={onErrorRecovery}
      />
    );
  }

  // Show onboarding guidance if required
  if (conversationState?.requiresOnboarding && conversationState?.currentIntent) {
    return (
      <OnboardingGuidance
        intentType={conversationState.currentIntent}
        missingInfo={conversationState.missingParameter}
        onContinue={onContinueOnboarding}
        onSkip={onSkipOnboarding}
        onGetHelp={onGetHelp}
      />
    );
  }

  return null;
}