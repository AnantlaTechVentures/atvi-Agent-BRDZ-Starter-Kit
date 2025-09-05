//Path: components/chat/QuickActions.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  ArrowLeftRight, 
  Wallet, 
  History, 
  Plus,
  Send,
  CreditCard,
  RefreshCw,
  LayoutGrid,
  List
} from 'lucide-react';

interface QuickActionsProps {
  onActionClick: (action: string) => void;
}

const quickActions = [
  { 
    icon: DollarSign, 
    label: 'Check Balance', 
    action: 'Show my USDC balance on all chains',
    category: 'balance'
  },
  { 
    icon: Plus, 
    label: 'Create Wallet', 
    action: 'Create a new crypto wallet for me',
    category: 'wallet'
  },
  { 
    icon: ArrowLeftRight, 
    label: 'Transfer Funds', 
    action: 'I want to transfer USDC between chains',
    category: 'transfer'
  },
  { 
    icon: History, 
    label: 'Transaction History', 
    action: 'Show my recent transaction history',
    category: 'history'
  },
  { 
    icon: Send, 
    label: 'Cross-Chain Bridge', 
    action: 'Bridge tokens from Sepolia to Amoy',
    category: 'bridge'
  },
  { 
    icon: CreditCard, 
    label: 'Add Chain Address', 
    action: 'Add a new chain address to my wallet',
    category: 'wallet'
  },
  { 
    icon: Wallet, 
    label: 'Wallet Overview', 
    action: 'Show me all my wallets and their addresses',
    category: 'wallet'
  },
  { 
    icon: RefreshCw, 
    label: 'Refresh Balances', 
    action: 'Update all my wallet balances',
    category: 'balance'
  },
];

export default function QuickActions({ onActionClick }: QuickActionsProps) {
  const [viewMode, setViewMode] = useState<'categorized' | 'grid'>('categorized');

  // Group actions by category for organized view
  const balanceActions = quickActions.filter(action => action.category === 'balance');
  const walletActions = quickActions.filter(action => action.category === 'wallet');
  const transferActions = quickActions.filter(action => action.category === 'transfer' || action.category === 'bridge');
  const historyActions = quickActions.filter(action => action.category === 'history');

  const renderActionGroup = (title: string, actions: typeof quickActions, gridCols = 2) => (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </p>
      <div className={`grid grid-cols-${gridCols} gap-2`}>
        {actions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onActionClick(action.action)}
            className="justify-start gap-2 h-auto py-2 px-3 text-left"
          >
            <action.icon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-xs truncate">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Quick Actions:</p>
        
        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <Button
            size="sm"
            variant={viewMode === 'categorized' ? 'default' : 'ghost'}
            onClick={() => setViewMode('categorized')}
            className="h-6 px-2"
          >
            <List className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            onClick={() => setViewMode('grid')}
            className="h-6 px-2"
          >
            <LayoutGrid className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Categorized View */}
      {viewMode === 'categorized' && (
        <div className="space-y-4">
          {renderActionGroup("Balance & Portfolio", balanceActions)}
          {renderActionGroup("Wallet Management", walletActions)}
          {renderActionGroup("Transfers & Bridging", transferActions)}
          {renderActionGroup("Activity", historyActions)}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => onActionClick(action.action)}
              className="justify-start gap-2 h-auto py-2 px-3 text-left"
            >
              <action.icon className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="text-xs truncate">{action.label}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}