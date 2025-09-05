//Path: components/transactions/crosschain/CrosschainResult.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Copy, ArrowRight } from 'lucide-react';

interface CrosschainResult {
  success: boolean;
  log_id?: string;
  nonce?: string;
  tx_hash?: string;
  error?: string;
  amount?: string;
  token?: string;
  from_chain?: string;
  to_chain?: string;
  status?: string;
}

interface CrosschainResultProps {
  result: CrosschainResult | null;
  isVisible: boolean;
}

const supportedChains = [
  { id: 'sepolia', name: 'Sepolia Testnet', icon: '🔷' },
  { id: 'amoy', name: 'Polygon Amoy', icon: '🟣' },
  { id: 'neon', name: 'Neon EVM', icon: '🟢' }
];

export default function CrosschainResult({ result, isVisible }: CrosschainResultProps) {
  if (!isVisible || !result) return null;

  const getChainIcon = (chainId?: string) => {
    return supportedChains.find(c => c.id === chainId)?.icon || '🔗';
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!result.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Bridge Failed
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {result.error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Bridge Completed
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant="outline" className="text-green-600 border-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              {result.status || 'Completed'}
            </Badge>
          </div>
          
          {result.amount && result.token && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount:</span>
              <span className="font-medium">
                {result.amount} {result.token}
              </span>
            </div>
          )}
          
          {result.from_chain && result.to_chain && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Bridge:</span>
              <div className="flex items-center gap-1">
                <span className="text-xs">
                  {getChainIcon(result.from_chain)}
                </span>
                <ArrowRight className="h-3 w-3" />
                <span className="text-xs">
                  {getChainIcon(result.to_chain)}
                </span>
              </div>
            </div>
          )}
          
          {result.log_id && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Log ID:</span>
              <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs font-mono">
                <span className="flex-1 truncate">{result.log_id}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyToClipboard(result.log_id || '')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
          
          {result.tx_hash && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Transaction Hash:</span>
              <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs font-mono">
                <span className="flex-1 truncate">{result.tx_hash}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyToClipboard(result.tx_hash || '')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
          
          {result.nonce && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Nonce:</span>
              <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs font-mono">
                <span className="flex-1 truncate">{result.nonce}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyToClipboard(result.nonce || '')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}