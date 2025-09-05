//Path: components/wallet/BalanceCard.tsx

'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface BalanceCardProps {
  title: string;
  amount: number;
  currency: string;
  trend?: number;
  className?: string;
}

export default function BalanceCard({ 
  title, 
  amount, 
  currency, 
  trend, 
  className = '' 
}: BalanceCardProps) {
  const isPositiveTrend = trend && trend > 0;

  return (
    <div className={`p-6 bg-card rounded-xl border security-glow ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-2">{title}</p>
          <p className="text-3xl font-bold">
            {currency === 'USD' ? '$' : ''}{amount.toLocaleString()}
            {currency !== 'USD' && ` ${currency}`}
          </p>
        </div>
        
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${
            isPositiveTrend ? 'text-secondary' : 'text-destructive'
          }`}>
            {isPositiveTrend ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );
}