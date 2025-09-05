//Path: components/transactions/crosschain/TokenAmountInput.tsx

'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface TokenAmountInputProps {
  value: string;
  onChange: (value: string) => void;
  balance?: string;
  token?: string;
  disabled?: boolean;
  label?: string;
}

export default function TokenAmountInput({ 
  value, 
  onChange, 
  balance,
  token = 'USDC',
  disabled = false,
  label = 'Amount'
}: TokenAmountInputProps) {
  
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          min="0"
          step="0.000001"
          placeholder="0.00"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="pr-16"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <span className="text-sm text-muted-foreground font-medium">{token}</span>
        </div>
      </div>
      {balance && (
        <p className="text-xs text-muted-foreground">
          Available: <span className="font-medium">{parseFloat(balance).toFixed(6)} {token}</span>
        </p>
      )}
    </div>
  );
}