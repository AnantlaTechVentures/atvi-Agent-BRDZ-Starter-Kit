//Path: components/transactions/crosschain/DestinationAddressInput.tsx

'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface DestinationAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  toChain?: string;
  disabled?: boolean;
  label?: string;
}

export default function DestinationAddressInput({ 
  value, 
  onChange, 
  toChain,
  disabled = false,
  label 
}: DestinationAddressInputProps) {
  
  const isValidAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const getChainName = (chain?: string) => {
    const chainNames: Record<string, string> = {
      'sepolia': 'Sepolia Testnet',
      'amoy': 'Polygon Amoy',
      'neon': 'Neon EVM'
    };
    return chainNames[chain || ''] || 'Destination Chain';
  };

  const displayLabel = label || `Recipient Address on ${getChainName(toChain)}`;

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{displayLabel}</Label>
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
      {toChain && (
        <p className="text-xs text-muted-foreground">
          This address will receive tokens on {getChainName(toChain)}
        </p>
      )}
    </div>
  );
}