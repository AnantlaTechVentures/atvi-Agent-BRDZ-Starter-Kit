//Path: components/chat/ChatInput.tsx

'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { useSDK } from '@/hooks/useSDK';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  placeholder?: string;
}

export default function ChatInput({ 
  onSendMessage, 
  disabled, 
  isProcessing, 
  placeholder = "Ask me about your wallets, balances, or blockchain operations..." 
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sdkReady } = useSDK();

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
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  // Quick action suggestions
  const quickActions = [
    "Show my wallet balance",
    "Create a new wallet",
    "Check USDC balance on Sepolia",
    "Transfer funds to another wallet"
  ];

  const isInputDisabled = disabled || !sdkReady || isProcessing;

  return (
    <div className="space-y-3">
      {/* Quick Actions - show only when input is empty */}
      {!message && (
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => setMessage(action)}
              disabled={isInputDisabled}
              className="text-xs h-8"
            >
              {action}
            </Button>
          ))}
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
            placeholder={!sdkReady ? "Initializing SDK..." : placeholder}
            disabled={isInputDisabled}
            className="min-h-[44px] max-h-[120px] resize-none pr-12"
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
          className="gradient-primary text-white border-0 h-[44px] w-[44px] p-0"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>

      {/* Status indicators */}
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <div>
          {!sdkReady ? (
            <span className="text-warning">⚠️ SDK initializing...</span>
          ) : isProcessing ? (
            <span className="text-info">🤖 AI is thinking...</span>
          ) : (
            <span>Press Enter to send, Shift+Enter for new line</span>
          )}
        </div>
        
        {message.length > 400 && (
          <span className={message.length > 500 ? "text-destructive" : "text-warning"}>
            {500 - message.length} characters remaining
          </span>
        )}
      </div>
    </div>
  );
}