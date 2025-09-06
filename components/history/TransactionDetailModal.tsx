//Path: components/history/TransactionDetailModal.tsx

'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowUpDown, Repeat, Copy, ExternalLink } from 'lucide-react';
import { CombinedTransaction } from './TransactionHistoryTable';

interface TransactionDetailModalProps {
  transaction: CombinedTransaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TransactionDetailModal({ transaction, isOpen, onClose }: TransactionDetailModalProps) {
  if (!transaction) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
      case 'COMPLETED':
      case 'MINTED':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'PENDING':
      case 'INITIATED':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'FAILED':
      case 'REJECTED':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === 'onchain' ? (
      <Badge variant="outline" className="text-blue-600 border-blue-600">
        <ArrowUpDown className="h-3 w-3 mr-1" />
        Onchain
      </Badge>
    ) : (
      <Badge variant="outline" className="text-purple-600 border-purple-600">
        <Repeat className="h-3 w-3 mr-1" />
        Crosschain
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatAmount = (amount: string, token: string) => {
    const num = parseFloat(amount);
    return `${num.toFixed(6)} ${token}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Transaction Receipt
            {getTypeBadge(transaction.type)}
          </DialogTitle>
          <DialogDescription>
            Complete transaction details and information
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status and Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Status</Label>
              <div className="mt-1">
                {getStatusBadge(transaction.status)}
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Amount</Label>
              <div className="mt-1 font-medium">
                {formatAmount(transaction.amount, transaction.token_symbol)}
              </div>
            </div>
          </div>

          {/* Chain Information */}
          {transaction.type === 'crosschain' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">From Chain</Label>
                <div className="mt-1">{transaction.from_chain}</div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">To Chain</Label>
                <div className="mt-1">{transaction.to_chain}</div>
              </div>
            </div>
          )}

          {/* Addresses */}
          <div className="space-y-3">
            {transaction.source_address && (
              <div>
                <Label className="text-sm text-muted-foreground">Source Address</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-muted p-2 rounded flex-1">
                    {transaction.source_address}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(transaction.source_address!)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            
            {(transaction.destination_address || transaction.to_address) && (
              <div>
                <Label className="text-sm text-muted-foreground">Destination Address</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-muted p-2 rounded flex-1">
                    {transaction.destination_address || transaction.to_address}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(
                      transaction.destination_address || transaction.to_address!
                    )}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Transaction Hashes */}
          <div className="space-y-3">
            {transaction.tx_hash && (
              <div>
                <Label className="text-sm text-muted-foreground">Transaction Hash</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-muted p-2 rounded flex-1">
                    {transaction.tx_hash}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(transaction.tx_hash!)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  {transaction.explorer_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(transaction.explorer_url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            {transaction.mint_tx_hash && (
              <div>
                <Label className="text-sm text-muted-foreground">Mint Transaction Hash</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-muted p-2 rounded flex-1">
                    {transaction.mint_tx_hash}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(transaction.mint_tx_hash!)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  {transaction.mint_explorer_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(transaction.mint_explorer_url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Fees */}
          {(transaction.gas_fee || transaction.platform_fee) && (
            <div className="grid grid-cols-2 gap-4">
              {transaction.gas_fee && (
                <div>
                  <Label className="text-sm text-muted-foreground">Gas Fee</Label>
                  <div className="mt-1">{transaction.gas_fee} ETH</div>
                </div>
              )}
              {transaction.platform_fee && (
                <div>
                  <Label className="text-sm text-muted-foreground">Platform Fee</Label>
                  <div className="mt-1">${transaction.platform_fee}</div>
                </div>
              )}
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Created At</Label>
              <div className="mt-1">{formatDate(transaction.created_at)}</div>
            </div>
            {transaction.updated_at && (
              <div>
                <Label className="text-sm text-muted-foreground">Updated At</Label>
                <div className="mt-1">{formatDate(transaction.updated_at)}</div>
              </div>
            )}
          </div>

          {/* Additional Info */}
          {transaction.nonce && (
            <div>
              <Label className="text-sm text-muted-foreground">Nonce</Label>
              <div className="mt-1">
                <code className="text-xs bg-muted p-2 rounded">{transaction.nonce}</code>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}