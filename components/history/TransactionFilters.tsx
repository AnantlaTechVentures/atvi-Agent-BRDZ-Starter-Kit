//Path: components/history/TransactionFilters.tsx

'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter, Search } from 'lucide-react';
import { TransactionFilters as TransactionFiltersType } from './TransactionHistoryTable';

interface TransactionFiltersProps {
  filters: TransactionFiltersType;
  setFilters: React.Dispatch<React.SetStateAction<TransactionFiltersType>>;
}

export default function TransactionFilters({ filters, setFilters }: TransactionFiltersProps) {
  return (
    <Card>
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
                <SelectItem value="all">All Status</SelectItem>
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
                <SelectItem value="all">All Types</SelectItem>
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
                <SelectItem value="all">All Chains</SelectItem>
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
                <SelectItem value="all">All Tokens</SelectItem>
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

          {/* Date To */}
          <div>
            <Label htmlFor="dateTo">To Date</Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}