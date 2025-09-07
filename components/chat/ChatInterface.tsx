'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSDK } from '@/hooks/useSDK';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatInput from '@/components/chat/ChatInput';
import QuickActions from '@/components/chat/QuickActions';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
  actions?: string[];
  data?: any;
  conversationState?: {
    requiresInput: boolean;
    requiresOnboarding: boolean;
    missingParameter?: string;
    availableOptions?: any[];
    awaitingConfirmation?: boolean;
    completed?: boolean;
    cancelled?: boolean;
  };
}

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

export default function ChatInterface() {
  const { user } = useAuth();
  const { 
    sdkReady, 
    sdk, 
    aiAgent, 
    conversationState, 
    aiState,
    hasActiveConversation,
    needsAIInput 
  } = useSDK();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'ai',
      text: 'Hello! I\'m your AI blockchain assistant. I can help you manage wallets, check balances, transfer funds, and execute cross-chain transactions using natural language. What would you like to do today?',
      timestamp: new Date().toISOString(),
      actions: [
        'Check my wallet balance',
        'Create a new wallet', 
        'Show transaction history',
        'Bridge USDC between chains'
      ]
    }
  ]);

  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationFlow, setConversationFlow] = useState<ConversationFlow>({
    isActive: false,
    currentIntent: null,
    requiresInput: false,
    requiresOnboarding: false,
    missingParameter: null,
    availableOptions: null,
    awaitingConfirmation: false,
    executionInProgress: false
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update conversation flow when SDK conversation state changes
  useEffect(() => {
    if (conversationState) {
      setConversationFlow(prev => ({
        ...prev,
        isActive: conversationState.isActive,
        currentIntent: conversationState.currentIntent,
        requiresInput: conversationState.requiresInput,
        requiresOnboarding: conversationState.requiresOnboarding,
        missingParameter: conversationState.missingParameter,
        availableOptions: conversationState.availableOptions
      }));
    }
  }, [conversationState]);

  // Check AI health on mount
  useEffect(() => {
    if (sdkReady && !aiState.isHealthy) {
      aiAgent.checkHealth().catch(console.error);
    }
  }, [sdkReady, aiState.isHealthy, aiAgent]);

  const sendMessage = async (text: string) => {
    if (!user || !text.trim() || !sdkReady) return;

    setError(null);
    setIsTyping(true);
    
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      let response;
      
      // Use appropriate AI method based on conversation state
      if (hasActiveConversation) {
        // Continue existing conversation
        response = await aiAgent.continueConversation(text.trim());
      } else {
        // Start new conversation
        response = await aiAgent.startConversation(text.trim());
      }

      console.log('AI Response:', response);

      if (response.success && response.agent_response) {
        const agentData = response.agent_response;
        
        // Update conversation flow state
        setConversationFlow(prev => ({
          ...prev,
          isActive: !agentData.completed && !agentData.cancelled,
          currentIntent: agentData.intent_type || prev.currentIntent,
          requiresInput: agentData.requires_input || false,
          requiresOnboarding: agentData.requires_onboarding || false,
          missingParameter: agentData.missing_parameter || null,
          availableOptions: agentData.available_options || null,
          awaitingConfirmation: agentData.missing_parameter === 'user_confirmation',
          executionInProgress: false
        }));

        // Create AI response message
        const aiMessage: ChatMessage = {
          id: `ai_${Date.now()}`,
          type: 'ai',
          text: agentData.message || agentData.ai_response || 'I\'ve processed your request.',
          timestamp: new Date().toISOString(),
          data: agentData.execution_result?.data || agentData.data,
          conversationState: {
            requiresInput: agentData.requires_input || false,
            requiresOnboarding: agentData.requires_onboarding || false,
            missingParameter: agentData.missing_parameter,
            availableOptions: agentData.available_options,
            awaitingConfirmation: agentData.missing_parameter === 'user_confirmation',
            completed: agentData.completed || false,
            cancelled: agentData.cancelled || false
          },
          actions: getContextualActions(agentData)
        };

        setMessages(prev => [...prev, aiMessage]);

        // Add system message for conversation flow guidance
        if (agentData.requires_onboarding) {
          const systemMessage: ChatMessage = {
            id: `system_${Date.now()}`,
            type: 'system',
            text: 'This operation requires additional verification. Please follow the guidance above.',
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, systemMessage]);
        }

        // Handle completion states
        if (agentData.completed) {
          setConversationFlow(prev => ({ ...prev, isActive: false }));
          
          // Add completion message
          setTimeout(() => {
            const completionMessage: ChatMessage = {
              id: `completion_${Date.now()}`,
              type: 'system',
              text: 'Operation completed successfully! You can start a new request.',
              timestamp: new Date().toISOString(),
              actions: ['Check balance', 'Create wallet', 'Transfer funds']
            };
            setMessages(prev => [...prev, completionMessage]);
          }, 1000);
        }

        if (agentData.cancelled) {
          setConversationFlow(prev => ({ ...prev, isActive: false }));
        }

      } else {
        // Handle error response
        const errorMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          type: 'ai',
          text: response.error?.message || 'I couldn\'t process that request. Could you try rephrasing it?',
          timestamp: new Date().toISOString(),
          actions: ['Check balance', 'Create wallet', 'Help with transfers']
        };
        
        setMessages(prev => [...prev, errorMessage]);
        setError(response.error?.message || 'Failed to process request');
      }
      
    } catch (error: any) {
      console.error('Failed to get AI response:', error);
      setError(error.message || 'Failed to process request');
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'ai',
        text: 'Sorry, I encountered an error processing your request. This might be due to network issues or if the AI service is temporarily unavailable. Please try again.',
        timestamp: new Date().toISOString(),
        actions: ['Try again', 'Check balance manually', 'Create wallet manually']
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const getContextualActions = (agentData: any): string[] => {
    // Return contextual actions based on agent response
    if (agentData.available_options) {
      return agentData.available_options;
    }

    if (agentData.suggested_actions) {
      return agentData.suggested_actions;
    }

    // Default actions based on intent type
    switch (agentData.intent_type) {
      case 'CREATE_WALLET':
        return ['Add chain address', 'Check balance', 'Create another wallet'];
      case 'CHECK_BALANCE':
        return ['Transfer funds', 'Check other chains', 'Export data'];
      case 'SEND_ONCHAIN':
      case 'SEND_CROSSCHAIN':
        return ['Check transaction status', 'Send another transaction', 'View history'];
      case 'TRANSACTION_HISTORY':
        return ['Export history', 'Filter transactions', 'Check specific transaction'];
      default:
        return ['Check balance', 'Create wallet', 'Transfer funds'];
    }
  };

  const handleQuickAction = (action: string) => {
    if (!sdkReady) return;
    sendMessage(action);
  };

  const clearConversation = async () => {
    try {
      await aiAgent.endConversation();
      setConversationFlow({
        isActive: false,
        currentIntent: null,
        requiresInput: false,
        requiresOnboarding: false,
        missingParameter: null,
        availableOptions: null,
        awaitingConfirmation: false,
        executionInProgress: false
      });
      setError(null);
    } catch (error) {
      console.error('Failed to clear conversation:', error);
    }
  };

  // Show SDK loading state
  if (!sdkReady) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">AI Chat Assistant</h3>
          <p className="text-sm text-muted-foreground">
            Initializing secure connection...
          </p>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <LoadingSpinner />
            <p className="text-muted-foreground">Loading AI assistant...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header with Conversation Status */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">AI Chat Assistant</h3>
            <p className="text-sm text-muted-foreground">
              Natural language blockchain operations
            </p>
          </div>
          
          {/* Conversation Status Indicator */}
          <div className="flex items-center gap-2">
            {conversationFlow.isActive && (
              <div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                <Clock className="h-3 w-3" />
                {conversationFlow.awaitingConfirmation ? 'Awaiting Confirmation' :
                 conversationFlow.requiresInput ? 'Needs Input' :
                 conversationFlow.requiresOnboarding ? 'Guidance Required' :
                 'In Progress'}
              </div>
            )}
            
            {!aiState.isHealthy && (
              <div className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                <AlertCircle className="h-3 w-3" />
                AI Offline
              </div>
            )}
            
            {aiState.isHealthy && (
              <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                <CheckCircle className="h-3 w-3" />
                AI Ready
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mt-3 border-destructive/50 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Active Conversation Info */}
        {conversationFlow.isActive && conversationFlow.currentIntent && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Active: {conversationFlow.currentIntent.replace('_', ' ').toLowerCase()}
                </p>
                {conversationFlow.missingParameter && (
                  <p className="text-xs text-blue-700">
                    Waiting for: {conversationFlow.missingParameter.replace('_', ' ')}
                  </p>
                )}
              </div>
              <button
                onClick={clearConversation}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble 
            key={message.id} 
            message={message}
            onActionClick={handleQuickAction}
          />
        ))}
        
        {isTyping && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <LoadingSpinner size="sm" />
            <span className="text-sm">AI is analyzing your request...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions - FIXED: Remove conversationState prop */}
      <div className="p-4 border-t border-border">
        <QuickActions 
          onActionClick={handleQuickAction}
        />
      </div>

      {/* Input - FIXED: Remove conversationState prop */}
      <div className="p-4 border-t border-border">
        <ChatInput 
          onSendMessage={sendMessage} 
          disabled={!sdkReady || !aiState.isHealthy}
          isProcessing={isTyping}
          placeholder={
            !sdkReady ? "SDK initializing..." :
            !aiState.isHealthy ? "AI service unavailable..." :
            conversationFlow.awaitingConfirmation ? "Type 'yes' to confirm or 'no' to cancel..." :
            conversationFlow.requiresInput ? `Please provide: ${conversationFlow.missingParameter?.replace('_', ' ')}` :
            "Ask me about your wallets, balances, or blockchain operations..."
          }
        />
      </div>
    </div>
  );
}