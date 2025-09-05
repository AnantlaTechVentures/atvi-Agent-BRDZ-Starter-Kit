//Path: app/chat/page.tsx

'use client';

import { useRequireAuth } from '@/contexts/AuthContext';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import ChatInterface from '@/components/chat/ChatInterface';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function ChatPage() {
  const { isAuthenticated, ekycStatus, isLoading } = useRequireAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || ekycStatus !== 'APPROVED') {
    return null; // useRequireAuth will redirect
  }

  return (
    <ProtectedLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">PAYAi Chat Mode</h1>
          <p className="text-muted-foreground">
            Natural language blockchain operations powered by AI
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChatInterface />
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-card rounded-xl border">
              <h3 className="font-medium mb-3">Example Commands</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• "Check my USDC balance on Sepolia"</p>
                <p>• "Bridge 100 USDC from Sepolia to Amoy"</p>
                <p>• "Show my transaction history"</p>
                <p>• "Create a new wallet"</p>
                <p>• "What's my total portfolio value?"</p>
              </div>
            </div>
            
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
              <h3 className="font-medium mb-2 text-primary">AI Assistant Tips</h3>
              <p className="text-sm text-muted-foreground">
                The AI understands natural language. You can ask questions in plain English
                and it will help you execute blockchain operations safely and efficiently.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}