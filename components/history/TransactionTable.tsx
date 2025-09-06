//Path: components/history/TransactionTable.tsx

'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, Repeat, Copy, Eye } from 'lucide-react';
import { CombinedTransaction } from './TransactionHistoryTable';

interface TransactionTableProps {
  transactions: CombinedTransaction[];
  onRowClick: (transaction: CombinedTransaction) => void;
}

export default function TransactionTable({ transactions, onRowClick }: TransactionTableProps) {
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

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No transactions found matching your filters
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>From/To</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>TX Hash</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow 
              key={tx.id} 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick(tx)}
            >
              <TableCell>{getTypeBadge(tx.type)}</TableCell>
              <TableCell>{getStatusBadge(tx.status)}</TableCell>
              <TableCell className="font-medium">
                {formatAmount(tx.amount, tx.token_symbol)}
              </TableCell>
              <TableCell>
                {tx.type === 'crosschain' ? (
                  <div className="text-sm">
                    <div>{tx.from_chain} → {tx.to_chain}</div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Same chain
                  </div>
                )}
              </TableCell>
              <TableCell>{formatDate(tx.created_at)}</TableCell>
              <TableCell>
                {tx.tx_hash ? (
                  <div className="flex items-center gap-2">
                    <code className="text-xs">
                      {tx.tx_hash.slice(0, 8)}...{tx.tx_hash.slice(-6)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(tx.tx_hash!);
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">No hash</span>
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowClick(tx);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}