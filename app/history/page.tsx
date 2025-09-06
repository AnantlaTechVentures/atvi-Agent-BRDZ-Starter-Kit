//Path: app/history/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth, useAuth } from '@/contexts/AuthContext';
import { useSDK } from '@/hooks/useSDK';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Search,
  Filter,
  Calendar,
  ArrowUpDown,
  Repeat,
  ExternalLink,
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye
} from 'lucide-react';

interface CombinedTransaction {
  id: string;
  type: 'onchain' | 'crosschain';
  tx_hash?: string;
  log_id?: string;
  amount: string;
  token_symbol: string;
  status: string;
  from_chain?: string;
  to_chain?: string;
  source_address?: string;
  destination_address?: string;
  to_address?: string;
  gas_fee?: number;
  platform_fee?: number;
  created_at: string;
  updated_at?: string;
  explorer_url?: string;
  mint_tx_hash?: string;
  mint_explorer_url?: string;
  nonce?: string;
}

interface TransactionFilters {
  search: string;
  status: string;
  type: string;
  chain: string;
  token: string;
  dateFrom: string;
  dateTo: string;
}

export default function TransactionHistoryPage() {
  const { isAuthenticated, ekycStatus, isLoading } = useRequireAuth();
  const { user } = useAuth();
  const { sdk, canMakeRequests } = useSDK();
  
  const [transactions, setTransactions] = useState<CombinedTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<CombinedTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<CombinedTransaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [filters, setFilters] = useState<TransactionFilters>({
    search: '',
    status: '',
    type: '',
    chain: '',
    token: '',
    dateFrom: '',
    dateTo: ''
  });

  // Load all transactions
  const loadAllTransactions = async () => {
    if (!canMakeRequests || !user?.user_id) return;

    try {
      setIsLoadingTransactions(true);
      const userId = typeof user.user_id === 'string' ? parseInt(user.user_id) : user.user_id;
      
      // Get both onchain and crosschain transactions
      const [onchainResponse, crosschainResponse] = await Promise.all([
        sdk.onchain.getTransactionHistory(userId, { limit: 100 }).catch(() => ({ success: false, data: { transactions: [] } })),
        sdk.crosschain.getTransactionHistory ? 
          sdk.crosschain.getTransactionHistory(userId, { limit: 100 }).catch(() => ({ success: false, data: { transactions: [] } })) :
          Promise.resolve({ success: false, data: { transactions: [] } })
      ]);
      
      // Combine and normalize transactions
      const combinedTransactions: CombinedTransaction[] = [];
      
      // Add onchain transactions
      if (onchainResponse?.success && onchainResponse.data.transactions) {
        onchainResponse.data.transactions.forEach((tx: any) => {
          combinedTransactions.push({
            id: tx.tx_hash || tx.id,
            type: 'onchain',
            tx_hash: tx.tx_hash,
            amount: tx.amount,
            token_symbol: tx.token_symbol,
            status: tx.status,
            to_address: tx.destination_wallet,
            gas_fee: tx.gas_fee,
            platform_fee: tx.platform_fee,
            created_at: tx.created_at,
            explorer_url: tx.explorer_url
          });
        });
      }
      
      // Add crosschain transactions
      if (crosschainResponse?.success && crosschainResponse.data.transactions) {
        crosschainResponse.data.transactions.forEach((tx: any) => {
          combinedTransactions.push({
            id: tx.log_id || tx.id,
            type: 'crosschain',
            log_id: tx.log_id,
            tx_hash: tx.tx_hash,
            amount: tx.amount,
            token_symbol: tx.currency_code,
            status: tx.status,
            from_chain: tx.from_chain,
            to_chain: tx.to_chain,
            source_address: tx.source_address,
            destination_address: tx.destination_address,
            created_at: tx.created_at,
            updated_at: tx.updated_at,
            explorer_url: tx.explorer_url,
            mint_tx_hash: tx.mint_tx_hash,
            mint_explorer_url: tx.mint_explorer_url,
            nonce: tx.nonce
          });
        });
      }
      
      // Sort by date (newest first)
      combinedTransactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setTransactions(combinedTransactions);
      setFilteredTransactions(combinedTransactions);
      
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  // Apply filters
  const applyFilters = () => {
    let filtered = [...transactions];
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.tx_hash?.toLowerCase().includes(searchLower) ||
        tx.log_id?.toLowerCase().includes(searchLower) ||
        tx.to_address?.toLowerCase().includes(searchLower) ||
        tx.source_address?.toLowerCase().includes(searchLower) ||
        tx.destination_address?.toLowerCase().includes(searchLower)
      );
    }
    
    // Status filter
    if (filters.status) {
      filtered = filtered.filter(tx => tx.status === filters.status);
    }
    
    // Type filter
    if (filters.type) {
      filtered = filtered.filter(tx => tx.type === filters.type);
    }
    
    // Chain filter
    if (filters.chain) {
      filtered = filtered.filter(tx => 
        tx.from_chain === filters.chain || tx.to_chain === filters.chain
      );
    }
    
    // Token filter
    if (filters.token) {
      filtered = filtered.filter(tx => tx.token_symbol === filters.token);
    }
    
    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(tx => 
        new Date(tx.created_at) >= new Date(filters.dateFrom)
      );
    }
    
    if (filters.dateTo) {
      filtered = filtered.filter(tx => 
        new Date(tx.created_at) <= new Date(filters.dateTo)
      );
    }
    
    setFilteredTransactions(filtered);
  };

  useEffect(() => {
    if (isAuthenticated && user?.user_id) {
      loadAllTransactions();
    }
  }, [canMakeRequests, user?.user_id]);

  useEffect(() => {
    applyFilters();
  }, [filters, transactions]);

  const handleRowClick = (transaction: CombinedTransaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || ekycStatus !== 'APPROVED') {
    return null;
  }

  return (
    <ProtectedLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Transaction History</h1>
            <p className="text-muted-foreground">
              Complete history of all onchain and crosschain transactions
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllTransactions}
            disabled={isLoadingTransactions}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingTransactions ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="TX hash, address..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                    <SelectItem value="INITIATED">Initiated</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="MINTED">Minted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type */}
              <div>
                <Label>Type</Label>
                <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="onchain">Onchain</SelectItem>
                    <SelectItem value="crosschain">Crosschain</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Chain */}
              <div>
                <Label>Chain</Label>
                <Select value={filters.chain} onValueChange={(value) => setFilters(prev => ({ ...prev, chain: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Chains" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Chains</SelectItem>
                    <SelectItem value="sepolia">Sepolia</SelectItem>
                    <SelectItem value="amoy">Amoy</SelectItem>
                    <SelectItem value="neon">Neon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Token */}
              <div>
                <Label>Token</Label>
                <Select value={filters.token} onValueChange={(value) => setFilters(prev => ({ ...prev, token: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Tokens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Tokens</SelectItem>
                    <SelectItem value="USDC">USDC</SelectItem>
                    <SelectItem value="ETH">ETH</SelectItem>
                    <SelectItem value="POL">POL</SelectItem>
                    <SelectItem value="NEON">NEON</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div>
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Transactions ({filteredTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
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
                    {filteredTransactions.map((tx) => (
                      <TableRow 
                        key={tx.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(tx)}
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
                              handleRowClick(tx);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredTransactions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No transactions found matching your filters
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction Detail Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Transaction Receipt
                {selectedTransaction && getTypeBadge(selectedTransaction.type)}
              </DialogTitle>
              <DialogDescription>
                Complete transaction details and information
              </DialogDescription>
            </DialogHeader>
            
            {selectedTransaction && (
              <div className="space-y-6">
                {/* Status and Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(selectedTransaction.status)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Amount</Label>
                    <div className="mt-1 font-medium">
                      {formatAmount(selectedTransaction.amount, selectedTransaction.token_symbol)}
                    </div>
                  </div>
                </div>

                {/* Chain Information */}
                {selectedTransaction.type === 'crosschain' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">From Chain</Label>
                      <div className="mt-1">{selectedTransaction.from_chain}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">To Chain</Label>
                      <div className="mt-1">{selectedTransaction.to_chain}</div>
                    </div>
                  </div>
                )}

                {/* Addresses */}
                <div className="space-y-3">
                  {selectedTransaction.source_address && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Source Address</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted p-2 rounded flex-1">
                          {selectedTransaction.source_address}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(selectedTransaction.source_address!)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {(selectedTransaction.destination_address || selectedTransaction.to_address) && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Destination Address</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted p-2 rounded flex-1">
                          {selectedTransaction.destination_address || selectedTransaction.to_address}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(
                            selectedTransaction.destination_address || selectedTransaction.to_address!
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
                  {selectedTransaction.tx_hash && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Transaction Hash</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted p-2 rounded flex-1">
                          {selectedTransaction.tx_hash}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(selectedTransaction.tx_hash!)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        {selectedTransaction.explorer_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(selectedTransaction.explorer_url, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {selectedTransaction.mint_tx_hash && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Mint Transaction Hash</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted p-2 rounded flex-1">
                          {selectedTransaction.mint_tx_hash}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(selectedTransaction.mint_tx_hash!)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        {selectedTransaction.mint_explorer_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(selectedTransaction.mint_explorer_url, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Fees */}
                {(selectedTransaction.gas_fee || selectedTransaction.platform_fee) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedTransaction.gas_fee && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Gas Fee</Label>
                        <div className="mt-1">{selectedTransaction.gas_fee} ETH</div>
                      </div>
                    )}
                    {selectedTransaction.platform_fee && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Platform Fee</Label>
                        <div className="mt-1">${selectedTransaction.platform_fee}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Timestamps */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Created At</Label>
                    <div className="mt-1">{formatDate(selectedTransaction.created_at)}</div>
                  </div>
                  {selectedTransaction.updated_at && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Updated At</Label>
                      <div className="mt-1">{formatDate(selectedTransaction.updated_at)}</div>
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                {selectedTransaction.nonce && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Nonce</Label>
                    <div className="mt-1">
                      <code className="text-xs bg-muted p-2 rounded">{selectedTransaction.nonce}</code>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedLayout>
  );
}