//Path: components/chat/ChatInput.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, AlertCircle, CheckCircle, X, HelpCircle } from 'lucide-react';
import { useSDK } from '@/hooks/useSDK';

type StatusType = 'loading' | 'error' | 'processing' | 'confirmation' | 'input' | 'guidance' | 'ready';

interface ConversationFlow {
  isActive: boolean;
  currentIntent: string | null;
  requiresInput: boolean;
  requiresOnboarding: boolean;
  missingParameter: string | null;
  availableOptions: any[] | null;
  awaitingConfirmation: boolean;
  executionInProgress: boolean;
}

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  placeholder?: string;
  conversationState?: ConversationFlow;
}

export default function ChatInput({ 
  onSendMessage, 
  disabled, 
  isProcessing, 
  placeholder = "Ask me about your wallets, balances, or blockchain operations...",
  conversationState
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sdkReady, aiState } = useSDK();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled && sdkReady && !isProcessing) {
      onSendMessage(message.trim());
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      setShowHelp(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  // Smart suggestions based on conversation state
  const getSmartSuggestions = () => {
    if (!conversationState) return [];

    if (conversationState.awaitingConfirmation) {
      return [
        { text: 'yes', label: 'Confirm transaction' },
        { text: 'no', label: 'Cancel transaction' }
      ];
    }

    if (conversationState.requiresInput && conversationState.missingParameter) {
      const param = conversationState.missingParameter;
      
      switch (param) {
        case 'wallet_id':
          return [
            { text: 'Show my wallets first', label: 'List wallets' },
            { text: 'Use my first wallet', label: 'Auto-select' }
          ];
        case 'chain_id':
          return [
            { text: 'Sepolia', label: 'Ethereum testnet' },
            { text: 'Amoy', label: 'Polygon testnet' },
            { text: 'Neon', label: 'Neon EVM' }
          ];
        case 'to_address':
          return [
            { text: 'Use one of my wallet addresses', label: 'Internal transfer' }
          ];
        case 'amount':
          return [
            { text: '10 USDC', label: 'Small amount' },
            { text: '100 USDC', label: 'Medium amount' }
          ];
        default:
          return [];
      }
    }

    // Default suggestions for new conversations
    if (!conversationState.isActive) {
      return [
        { text: 'Check my wallet balance', label: 'View balances' },
        { text: 'Create a new wallet', label: 'New wallet' },
        { text: 'Show transaction history', label: 'View history' },
        { text: 'Bridge USDC between chains', label: 'Cross-chain' }
      ];
    }

    return [];
  };

  const getInputStatus = (): { type: StatusType; message: string } => {
    if (!sdkReady) return { type: 'loading', message: 'Initializing SDK...' };
    if (!aiState.isHealthy) return { type: 'error', message: 'AI service unavailable' };
    if (isProcessing) return { type: 'processing', message: 'AI is thinking...' };
    
    if (conversationState?.awaitingConfirmation) {
      return { type: 'confirmation', message: 'Type "yes" to confirm or "no" to cancel' };
    }
    
    if (conversationState?.requiresInput && conversationState.missingParameter) {
      return { 
        type: 'input', 
        message: `Please provide: ${conversationState.missingParameter.replace('_', ' ')}` 
      };
    }
    
    if (conversationState?.requiresOnboarding) {
      return { type: 'guidance', message: 'Please follow the guidance above before proceeding' };
    }

    return { type: 'ready', message: 'Ready for your message' };
  };

  const renderInputStatus = () => {
    const status = getInputStatus();
    
    // Remove duplicate type definition - already defined at top level
    const statusIcons: Record<StatusType, React.ReactElement> = {
      loading: <Loader2 className="h-3 w-3 animate-spin" />,
      error: <AlertCircle className="h-3 w-3 text-destructive" />,
      processing: <Loader2 className="h-3 w-3 animate-spin text-blue-600" />,
      confirmation: <AlertCircle className="h-3 w-3 text-orange-600" />,
      input: <HelpCircle className="h-3 w-3 text-blue-600" />,
      guidance: <HelpCircle className="h-3 w-3 text-purple-600" />,
      ready: <CheckCircle className="h-3 w-3 text-green-600" />
    };

    const statusColors: Record<StatusType, string> = {
      loading: 'text-muted-foreground',
      error: 'text-destructive',
      processing: 'text-blue-600',
      confirmation: 'text-orange-600',
      input: 'text-blue-600',
      guidance: 'text-purple-600',
      ready: 'text-green-600'
    };

    return (
      <div className={`flex items-center gap-1 ${statusColors[status.type]}`}>
        {statusIcons[status.type]}
        <span className="text-xs">{status.message}</span>
      </div>
    );
  };

  const smartSuggestions = getSmartSuggestions();
  const isInputDisabled = disabled || !sdkReady || isProcessing || !aiState.isHealthy;
  const inputStatus = getInputStatus();

  // Focus management for better UX
  useEffect(() => {
    if (conversationState?.requiresInput || conversationState?.awaitingConfirmation) {
      textareaRef.current?.focus();
    }
  }, [conversationState?.requiresInput, conversationState?.awaitingConfirmation]);

  return (
    <div className="space-y-3">
      {/* Conversation Context Bar */}
      {conversationState?.isActive && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {conversationState.currentIntent?.replace('_', ' ').toLowerCase()}
              </Badge>
              {conversationState.missingParameter && (
                <span className="text-xs text-blue-700">
                  Waiting for: {conversationState.missingParameter.replace('_', ' ')}
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                // This would trigger conversation end in parent component
                // For now, just clear the message
                setMessage('cancel');
                handleSubmit(new Event('submit') as any);
              }}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Smart Suggestions */}
      {smartSuggestions.length > 0 && !message && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {conversationState?.awaitingConfirmation ? 'Confirmation required:' :
               conversationState?.requiresInput ? 'Quick options:' :
               'Quick actions:'}
            </span>
            {smartSuggestions.length > 4 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowHelp(!showHelp)}
                className="h-6 text-xs"
              >
                {showHelp ? 'Hide' : 'Show all'}
              </Button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {(showHelp ? smartSuggestions : smartSuggestions.slice(0, 4)).map((suggestion, index) => (
              <Button
                key={index}
                variant={conversationState?.awaitingConfirmation ? 
                  (suggestion.text === 'yes' ? 'default' : 'outline') : 'outline'}
                size="sm"
                onClick={() => setMessage(suggestion.text)}
                disabled={isInputDisabled}
                className={`text-xs h-8 ${
                  conversationState?.awaitingConfirmation && suggestion.text === 'yes' 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : conversationState?.awaitingConfirmation && suggestion.text === 'no'
                    ? 'border-red-300 text-red-700 hover:bg-red-50'
                    : ''
                }`}
              >
                <span className="font-medium">{suggestion.text}</span>
                {suggestion.label && (
                  <span className="text-muted-foreground ml-1">· {suggestion.label}</span>
                )}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isInputDisabled}
            className={`min-h-[44px] max-h-[120px] resize-none pr-12 ${
              conversationState?.awaitingConfirmation ? 'border-orange-300 focus:border-orange-500' :
              conversationState?.requiresInput ? 'border-blue-300 focus:border-blue-500' :
              inputStatus.type === 'error' ? 'border-destructive' :
              ''
            }`}
            rows={1}
          />
          
          {/* Character count */}
          {message.length > 0 && (
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              {message.length}/500
            </div>
          )}
        </div>

        <Button 
          type="submit" 
          disabled={isInputDisabled || !message.trim() || message.length > 500}
          className={`h-[44px] w-[44px] p-0 ${
            conversationState?.awaitingConfirmation && message.toLowerCase().includes('yes')
              ? 'bg-green-600 hover:bg-green-700'
              : conversationState?.awaitingConfirmation && message.toLowerCase().includes('no')
              ? 'bg-red-600 hover:bg-red-700'
              : 'gradient-primary text-white border-0'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>

      {/* Status and Help */}
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-3">
          {renderInputStatus()}
          
          {/* Keyboard shortcuts */}
          {inputStatus.type === 'ready' && (
            <span className="text-muted-foreground">
              Press Enter to send, Shift+Enter for new line
            </span>
          )}
        </div>
        
        {/* Character limit warning */}
        {message.length > 400 && (
          <span className={message.length > 500 ? "text-destructive" : "text-warning"}>
            {500 - message.length} characters remaining
          </span>
        )}
      </div>

      {/* Help Card for complex operations */}
      {showHelp && conversationState?.requiresInput && (
        <Card className="p-3 bg-muted/30">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Need help with {conversationState.missingParameter?.replace('_', ' ')}?</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowHelp(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1">
              {conversationState.missingParameter === 'wallet_id' && (
                <>
                  <p>• You can specify wallet by name: "Use MyWallet"</p>
                  <p>• Or by ID: "Use wallet 123"</p>
                  <p>• Or ask me to list your wallets first</p>
                </>
              )}
              {conversationState.missingParameter === 'to_address' && (
                <>
                  <p>• Paste a complete wallet address (0x...)</p>
                  <p>• Or say "use my other wallet address"</p>
                  <p>• Make sure the address is for the correct blockchain</p>
                </>
              )}
              {conversationState.missingParameter === 'amount' && (
                <>
                  <p>• Specify amount with currency: "10 USDC"</p>
                  <p>• Use decimal amounts: "1.5 USDC"</p>
                  <p>• Check your balance first if unsure</p>
                </>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}