//Path: components/chat/MessageBubble.tsx

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, User, Wallet, ArrowUpRight, Copy } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  text: string;
  timestamp: string;
  actions?: string[];
  data?: any; // For structured responses like wallet data, balances, etc.
}

interface MessageBubbleProps {
  message: ChatMessage;
  onActionClick?: (action: string) => void;
}

export default function MessageBubble({ message, onActionClick }: MessageBubbleProps) {
  const isUser = message.type === 'user';
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderStructuredData = () => {
    if (!message.data) return null;

    // Wallet Balance Data
    if (message.data.wallets || message.data.balance_data) {
      const wallets = message.data.wallets || message.data.balance_data;
      return (
        <div className="mt-3 space-y-2">
          {wallets.map((wallet: any, index: number) => (
            <Card key={index} className="bg-muted/50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">
                      {wallet.wallet_name || `Wallet ${index + 1}`}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(wallet.address || wallet.wallet_id)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                
                {wallet.balances && (
                  <div className="mt-2 space-y-1">
                    {wallet.balances.map((balance: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {balance.symbol} ({balance.chain})
                        </span>
                        <span className="font-mono">
                          {balance.balance} {balance.symbol}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    // Transaction History Data
    if (message.data.transactions) {
      const transactions = message.data.transactions.slice(0, 5); // Show latest 5
      return (
        <div className="mt-3 space-y-2">
          {transactions.map((tx: any, index: number) => (
            <Card key={index} className="bg-muted/50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 text-secondary" />
                    <div>
                      <p className="text-xs font-medium">
                        {tx.type || 'Transaction'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono">
                      {tx.amount} {tx.currency}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.status}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    // Wallet Creation Data
    if (message.data.wallet_info) {
      const wallet = message.data.wallet_info;
      return (
        <Card className="mt-3 bg-secondary/10 border-secondary">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4 text-secondary" />
              <span className="font-medium text-sm">New Wallet Created</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span>{wallet.wallet_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-mono">{wallet.wallet_id}</span>
              </div>
              {wallet.supported_chains && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chains:</span>
                  <span>{wallet.supported_chains.join(', ')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    // Generic data display
    if (typeof message.data === 'object') {
      return (
        <Card className="mt-3 bg-muted/50">
          <CardContent className="p-3">
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(message.data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-3 mb-4`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      
      <div className={`max-w-[80%] ${isUser ? 'text-right' : 'text-left'}`}>
        <div
          className={`inline-block p-3 rounded-lg ${
            isUser 
              ? 'chat-bubble-user ml-auto bg-primary text-primary-foreground' 
              : 'chat-bubble-ai bg-muted'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
          
          {/* Render structured data */}
          {!isUser && renderStructuredData()}
        </div>
        
        <p className="text-xs text-muted-foreground mt-1 px-2">
          {timestamp}
        </p>

        {/* Action Buttons */}
        {message.actions && message.actions.length > 0 && !isUser && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.actions.map((action, index) => (
              <Button
                key={index}
                size="sm"
                variant="outline"
                onClick={() => onActionClick?.(action)}
                className="text-xs h-7 px-2"
              >
                {action}
              </Button>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center">
          <User className="h-4 w-4 text-secondary" />
        </div>
      )}
    </div>
  );
}