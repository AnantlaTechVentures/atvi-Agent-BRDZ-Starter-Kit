'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSDK } from '@/hooks/useSDK';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatInput from '@/components/chat/ChatInput';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  text: string;
  timestamp: string;
  data?: any;
}

interface ConversationFlow {
  isActive: boolean;
  currentIntent: string | null;
  requiresInput: boolean;
  missingParameter: string | null;
  awaitingConfirmation: boolean;
}

export default function ChatInterface() {
  const { user } = useAuth();
  const { 
    sdkReady, 
    aiAgent, 
    conversationState, 
    aiState,
    hasActiveConversation
  } = useSDK();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'ai',
      text: 'Hi! I\'m your blockchain assistant. I can help you check balances, send tokens, create wallets, and more. Just tell me what you\'d like to do in plain English.',
      timestamp: new Date().toISOString()
    }
  ]);

  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationFlow, setConversationFlow] = useState<ConversationFlow>({
    isActive: false,
    currentIntent: null,
    requiresInput: false,
    missingParameter: null,
    awaitingConfirmation: false
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
        missingParameter: conversationState.missingParameter,
        awaitingConfirmation: conversationState.missingParameter === 'user_confirmation'
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
        response = await aiAgent.continueConversation(text.trim());
      } else {
        response = await aiAgent.startConversation(text.trim());
      }

      if (response.success && response.agent_response) {
        const agentData = response.agent_response;
        
        // Update conversation flow state
        setConversationFlow(prev => ({
          ...prev,
          isActive: !agentData.completed && !agentData.cancelled,
          currentIntent: agentData.intent_type || prev.currentIntent,
          requiresInput: agentData.requires_input || false,
          missingParameter: agentData.missing_parameter || null,
          awaitingConfirmation: agentData.missing_parameter === 'user_confirmation'
        }));

        // Create AI response message
        const aiMessage: ChatMessage = {
          id: `ai_${Date.now()}`,
          type: 'ai',
          text: agentData.message || agentData.ai_response || 'I\'ve processed your request.',
          timestamp: new Date().toISOString(),
          data: agentData.execution_result?.data || agentData.data
        };

        setMessages(prev => [...prev, aiMessage]);

        // Handle completion states
        if (agentData.completed) {
          setConversationFlow(prev => ({ ...prev, isActive: false }));
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
          timestamp: new Date().toISOString()
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
        text: 'Sorry, I encountered an error. Please try again or rephrase your request.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearConversation = async () => {
    try {
      await aiAgent.endConversation();
      setConversationFlow({
        isActive: false,
        currentIntent: null,
        requiresInput: false,
        missingParameter: null,
        awaitingConfirmation: false
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
          <h3 className="font-semibold">AI Assistant</h3>
          <p className="text-sm text-muted-foreground">
            Connecting...
          </p>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <LoadingSpinner />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] flex flex-col bg-background border rounded-xl">
      {/* Simple Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">AI Assistant</h3>
            <p className="text-sm text-muted-foreground">
              Ask me anything about your crypto wallets
            </p>
          </div>
          
          {/* Simple Status Indicator */}
          <div className="flex items-center gap-2">
            {aiState.isHealthy ? (
              <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                <CheckCircle className="h-3 w-3" />
                Ready
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                <AlertCircle className="h-3 w-3" />
                Offline
              </div>
            )}
          </div>
        </div>

        {/* Simple Error Display */}
        {error && (
          <Alert className="mt-3 border-destructive/50 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble 
            key={message.id} 
            message={message}
          />
        ))}
        
        {isTyping && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <LoadingSpinner size="sm" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Simple Input */}
      <div className="p-4 border-t border-border">
        <ChatInput 
          onSendMessage={sendMessage} 
          disabled={!sdkReady || !aiState.isHealthy}
          isProcessing={isTyping}
          placeholder={
            !sdkReady ? "Connecting..." :
            !aiState.isHealthy ? "AI is offline..." :
            conversationFlow.awaitingConfirmation ? "Type 'yes' to confirm or 'no' to cancel" :
            conversationFlow.requiresInput ? `Please provide: ${conversationFlow.missingParameter?.replace('_', ' ')}` :
            "Ask me about wallets, balances, or transactions..."
          }
        />
      </div>
    </div>
  );
}