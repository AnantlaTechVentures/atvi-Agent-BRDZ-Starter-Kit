//Path: components/chat/QuickActions.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  List,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Shield,
  TrendingUp
} from 'lucide-react';

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

interface QuickActionsProps {
  onActionClick: (action: string) => void;
  conversationState?: ConversationFlow;
}

interface QuickAction {
  icon: any;
  label: string;
  action: string;
  category: string;
  priority: number;
  requiresAuth?: boolean;
  complexity: 'simple' | 'medium' | 'complex';
  description?: string;
}

const allQuickActions: QuickAction[] = [
  // Balance & Portfolio (High Priority)
  { 
    icon: DollarSign, 
    label: 'Check Balance', 
    action: 'Show my USDC balance on all chains',
    category: 'balance',
    priority: 1,
    complexity: 'simple',
    description: 'View wallet balances across all supported chains'
  },
  { 
    icon: TrendingUp, 
    label: 'Portfolio Overview', 
    action: 'Show my complete portfolio overview with total value',
    category: 'balance',
    priority: 2,
    complexity: 'simple',
    description: 'Complete portfolio summary and total value'
  },
  { 
    icon: RefreshCw, 
    label: 'Refresh Balances', 
    action: 'Update all my wallet balances from blockchain',
    category: 'balance',
    priority: 3,
    complexity: 'simple',
    description: 'Get latest balance data from blockchain'
  },

  // Wallet Management (High Priority)
  { 
    icon: Plus, 
    label: 'Create Wallet', 
    action: 'Create a new crypto wallet for me',
    category: 'wallet',
    priority: 1,
    complexity: 'medium',
    description: 'Create new multi-chain wallet'
  },
  { 
    icon: Wallet, 
    label: 'Wallet Overview', 
    action: 'Show me all my wallets and their addresses',
    category: 'wallet',
    priority: 2,
    complexity: 'simple',
    description: 'View all wallets and their chain addresses'
  },
  { 
    icon: CreditCard, 
    label: 'Add Chain Address', 
    action: 'Add a new chain address to my wallet',
    category: 'wallet',
    priority: 3,
    complexity: 'medium',
    description: 'Add blockchain address to existing wallet'
  },

  // Transfers & Transactions (Medium Priority)
  { 
    icon: Send, 
    label: 'Send USDC', 
    action: 'I want to send USDC to another address',
    category: 'transfer',
    priority: 1,
    complexity: 'complex',
    requiresAuth: true,
    description: 'Send USDC tokens to another wallet'
  },
  { 
    icon: ArrowLeftRight, 
    label: 'Cross-Chain Bridge', 
    action: 'Bridge tokens from Sepolia to Amoy',
    category: 'bridge',
    priority: 2,
    complexity: 'complex',
    requiresAuth: true,
    description: 'Transfer tokens between different blockchains'
  },
  { 
    icon: Zap, 
    label: 'Quick Transfer', 
    action: 'Transfer 10 USDC between my wallets',
    category: 'transfer',
    priority: 3,
    complexity: 'complex',
    requiresAuth: true,
    description: 'Quick transfer between your own wallets'
  },

  // History & Activity (Low Priority)
  { 
    icon: History, 
    label: 'Transaction History', 
    action: 'Show my recent transaction history',
    category: 'history',
    priority: 1,
    complexity: 'simple',
    description: 'View recent blockchain transactions'
  },
  { 
    icon: Shield, 
    label: 'Security Review', 
    action: 'Review my wallet security and recent activity',
    category: 'history',
    priority: 2,
    complexity: 'medium',
    description: 'Security audit of wallet activity'
  }
];

export default function QuickActions({ onActionClick, conversationState }: QuickActionsProps) {
  const [viewMode, setViewMode] = useState<'smart' | 'categorized' | 'grid'>('smart');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Smart filtering based on conversation state
  const getContextualActions = (): QuickAction[] => {
    if (!conversationState?.isActive) {
      // New conversation - show high priority actions
      return allQuickActions
        .filter(action => action.priority <= 2)
        .sort((a, b) => a.priority - b.priority);
    }

    // Active conversation - show contextual actions
    const intent = conversationState.currentIntent;
    
    if (intent?.includes('WALLET')) {
      return allQuickActions.filter(action => 
        action.category === 'wallet' || action.category === 'balance'
      );
    }
    
    if (intent?.includes('BALANCE') || intent?.includes('CHECK')) {
      return allQuickActions.filter(action => 
        action.category === 'balance' || action.category === 'transfer'
      );
    }
    
    if (intent?.includes('SEND') || intent?.includes('TRANSFER')) {
      return allQuickActions.filter(action => 
        action.category === 'transfer' || action.category === 'bridge' || action.category === 'history'
      );
    }
    
    if (intent?.includes('HISTORY')) {
      return allQuickActions.filter(action => 
        action.category === 'history' || action.category === 'balance'
      );
    }

    // Default contextual actions
    return allQuickActions.filter(action => action.priority <= 2);
  };

  const getActionsToShow = (): QuickAction[] => {
    switch (viewMode) {
      case 'smart':
        return getContextualActions();
      case 'grid':
        return showAdvanced ? allQuickActions : allQuickActions.filter(action => action.priority <= 2);
      case 'categorized':
        return showAdvanced ? allQuickActions : allQuickActions.filter(action => action.priority <= 2);
      default:
        return getContextualActions();
    }
  };

  const renderSmartView = () => {
    const actions = getContextualActions();
    const simpleActions = actions.filter(action => action.complexity === 'simple');
    const complexActions = actions.filter(action => action.complexity !== 'simple');

    return (
      <div className="space-y-4">
        {/* Context-aware header */}
        {conversationState?.isActive && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Active: {conversationState.currentIntent?.replace('_', ' ').toLowerCase()}
                </span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Here are some related actions you might want to do next:
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick & Easy Actions */}
        {simpleActions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Quick & Easy</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {simpleActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => onActionClick(action.action)}
                  className="justify-start gap-3 h-auto py-3 px-4 text-left hover:bg-green-50 border-green-200"
                >
                  <action.icon className="h-4 w-4 flex-shrink-0 text-green-600" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{action.label}</div>
                    {action.description && (
                      <div className="text-xs text-muted-foreground">{action.description}</div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Actions */}
        {complexActions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">Advanced Operations</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {complexActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => onActionClick(action.action)}
                  className="justify-start gap-3 h-auto py-3 px-4 text-left hover:bg-orange-50 border-orange-200"
                >
                  <action.icon className="h-4 w-4 flex-shrink-0 text-orange-600" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{action.label}</div>
                    {action.description && (
                      <div className="text-xs text-muted-foreground">{action.description}</div>
                    )}
                    {action.requiresAuth && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        Requires confirmation
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCategorizedView = () => {
    const actions = getActionsToShow();
    const categories = {
      balance: { title: 'Balance & Portfolio', icon: DollarSign, color: 'green' },
      wallet: { title: 'Wallet Management', icon: Wallet, color: 'blue' },
      transfer: { title: 'Transfers', icon: Send, color: 'orange' },
      bridge: { title: 'Cross-Chain', icon: ArrowLeftRight, color: 'purple' },
      history: { title: 'Activity & Security', icon: History, color: 'gray' }
    };

    return (
      <div className="space-y-4">
        {Object.entries(categories).map(([categoryKey, category]) => {
          const categoryActions = actions.filter(action => action.category === categoryKey);
          if (categoryActions.length === 0) return null;

          return (
            <div key={categoryKey} className="space-y-2">
              <div className="flex items-center gap-2">
                <category.icon className={`h-4 w-4 text-${category.color}-600`} />
                <span className={`text-sm font-medium text-${category.color}-800`}>
                  {category.title}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {categoryActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
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
        })}
      </div>
    );
  };

  const renderGridView = () => {
    const actions = getActionsToShow();
    
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            onClick={() => onActionClick(action.action)}
            className="justify-start gap-2 h-auto py-3 px-3 text-left"
          >
            <action.icon className="h-4 w-4 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{action.label}</div>
              {action.complexity !== 'simple' && (
                <Badge variant="secondary" className="text-xs mt-1">
                  {action.complexity}
                </Badge>
              )}
            </div>
          </Button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {conversationState?.isActive ? 'Related Actions:' : 'Quick Actions:'}
          </p>
          {conversationState?.isActive && (
            <Badge variant="secondary" className="text-xs">
              Context-aware
            </Badge>
          )}
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center gap-1">
          <div className="bg-muted p-1 rounded-lg flex">
            <Button
              size="sm"
              variant={viewMode === 'smart' ? 'default' : 'ghost'}
              onClick={() => setViewMode('smart')}
              className="h-6 px-2 text-xs"
            >
              <Zap className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'categorized' ? 'default' : 'ghost'}
              onClick={() => setViewMode('categorized')}
              className="h-6 px-2 text-xs"
            >
              <List className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              onClick={() => setViewMode('grid')}
              className="h-6 px-2 text-xs"
            >
              <LayoutGrid className="h-3 w-3" />
            </Button>
          </div>
          
          {(viewMode === 'grid' || viewMode === 'categorized') && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-6 px-2 text-xs"
            >
              {showAdvanced ? 'Simple' : 'Advanced'}
            </Button>
          )}
        </div>
      </div>
      
      {/* Render based on view mode */}
      {viewMode === 'smart' && renderSmartView()}
      {viewMode === 'categorized' && renderCategorizedView()}
      {viewMode === 'grid' && renderGridView()}

      {/* Help Text */}
      {!conversationState?.isActive && (
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Tip:</strong> You can also type naturally like "Check my USDC balance" 
              or "Send 10 USDC to my friend". The AI will guide you through complex operations step by step.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}