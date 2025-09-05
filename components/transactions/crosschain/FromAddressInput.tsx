//Path: components/transactions/crosschain/FromAddressInput.tsx

'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface FromAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  tokens?: Array<{
    symbol: string;
    balance: string;
  }>;
  disabled?: boolean;
  label?: string;
}

export default function FromAddressInput({ 
  value, 
  onChange, 
  tokens = [],
  disabled = false,
  label = 'From Address'
}: FromAddressInputProps) {
  
  const isValidAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Input
        type="text"
        placeholder="0x..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={value && !isValidAddress(value) ? 'border-red-500' : ''}
      />
      {value && !isValidAddress(value) && (
        <p className="text-xs text-red-500">Invalid address format</p>
      )}
      {value && isValidAddress(value) && tokens.length > 0 && (
        <div className="p-2 bg-muted rounded text-xs space-y-1">
          <div>
            <span className="text-muted-foreground">Address: </span>
            <code>{value.slice(0, 8)}...{value.slice(-8)}</code>
          </div>
          <div className="text-muted-foreground">
            Available tokens: {tokens.map(token => 
              `${parseFloat(token.balance).toFixed(4)} ${token.symbol}`
            ).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}