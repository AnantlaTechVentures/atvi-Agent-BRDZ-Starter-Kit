'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSDK } from '@/hooks/useSDK';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatInput from '@/components/chat/ChatInput';
import QuickActions from '@/components/chat/QuickActions';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  text: string;
  timestamp: string;
  actions?: string[];
  data?: any;
}

export default function ChatInterface() {
  const { user } = useAuth();
  const { sdkReady, sdk } = useSDK();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'ai',
      text: 'Hello! I\'m your AI blockchain assistant. I can help you check balances, create wallets, transfer funds, and more. What would you like to do today?',
      timestamp: new Date().toISOString(),
      actions: ['Check my wallet balance', 'Create a new wallet', 'Show transaction history', 'Check USDC balance on Sepolia']
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!user || !text.trim() || !sdkReady) return;

    setError(null);
    
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await sdk.cryptoWallet.processAIIntent({
        user_input: text.trim(),
        user_id: Number(user.user_id)
      });
      
      let aiMessage: ChatMessage;
      
      if (response.success || response.data) {
        const aiData = response.data || response;
        
        if (aiData.action === 'wallet_balance') {
          aiMessage = {
            id: `ai_${Date.now()}`,
            type: 'ai',
            text: aiData.message || 'Here are your wallet balances:',
            timestamp: new Date().toISOString(),
            data: aiData.wallets || aiData.balance_data,
            actions: ['Create new wallet', 'Transfer funds', 'Check specific chain']
          };
        } else if (aiData.action === 'create_wallet') {
          aiMessage = {
            id: `ai_${Date.now()}`,
            type: 'ai',
            text: aiData.message || `Wallet "${aiData.wallet_name}" created successfully!`,
            timestamp: new Date().toISOString(),
            data: aiData.wallet_info,
            actions: ['Add chain address', 'Check balance', 'Create another wallet']
          };
        } else if (aiData.action === 'transaction_history') {
          aiMessage = {
            id: `ai_${Date.now()}`,
            type: 'ai',
            text: aiData.message || 'Here is your transaction history:',
            timestamp: new Date().toISOString(),
            data: aiData.transactions,
            actions: ['Check specific transaction', 'Filter by chain', 'Export history']
          };
        } else {
          aiMessage = {
            id: `ai_${Date.now()}`,
            type: 'ai',
            text: aiData.message || aiData.response || 'I\'ve processed your request.',
            timestamp: new Date().toISOString(),
            data: aiData,
            actions: aiData.suggested_actions || ['Check balance', 'Create wallet', 'Transfer funds']
          };
        }
      } else {
        aiMessage = {
          id: `ai_${Date.now()}`,
          type: 'ai',
          text: response.error || 'I couldn\'t process that request. Could you try rephrasing it?',
          timestamp: new Date().toISOString(),
          actions: ['Check balance', 'Create wallet', 'Help with transfers']
        };
      }
      
      setMessages(prev => [...prev, aiMessage]);
      
    } catch (error: any) {
      console.error('Failed to get AI response:', error);
      setError(error.message || 'Failed to process request');
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'ai',
        text: 'Sorry, I encountered an error processing your request. This might be due to network issues or if the AI service is temporarily unavailable.',
        timestamp: new Date().toISOString(),
        actions: ['Try again', 'Check balance manually', 'Create wallet manually']
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action: string) => {
    if (!sdkReady) return;
    sendMessage(action);
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
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">AI Chat Assistant</h3>
        <p className="text-sm text-muted-foreground">
          Natural language blockchain operations
        </p>
        {error && (
          <p className="text-xs text-destructive mt-1">
            Connection issue: {error}
          </p>
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

      {/* Quick Actions */}
      <div className="p-4 border-t border-border">
        <QuickActions onActionClick={handleQuickAction} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <ChatInput 
          onSendMessage={sendMessage} 
          disabled={!sdkReady}
          isProcessing={isTyping}
          placeholder={!sdkReady ? "SDK initializing..." : "Ask me about your wallets, balances, or blockchain operations..."}
        />
      </div>
    </div>
  );
}