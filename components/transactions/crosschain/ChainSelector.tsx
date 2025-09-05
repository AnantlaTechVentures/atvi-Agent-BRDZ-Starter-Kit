//Path: components/transactions/crosschain/ChainSelector.tsx

'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CHAINS = [
  { label: 'Ethereum (Sepolia)', value: 'sepolia', enabled: true, icon: '🔷' },
  { label: 'Polygon (Amoy)', value: 'amoy', enabled: true, icon: '🟣' },
  { label: 'Neon EVM', value: 'neon', enabled: true, icon: '🟢' },
];

interface ChainSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  availableChains?: string[]; // Optional filter untuk chains yang tersedia
  disabled?: boolean;
}

export default function ChainSelector({ 
  label, 
  value, 
  onChange, 
  availableChains,
  disabled = false 
}: ChainSelectorProps) {
  
  const filteredChains = availableChains 
    ? CHAINS.filter(chain => availableChains.includes(chain.value))
    : CHAINS;

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Select chain" />
        </SelectTrigger>
        <SelectContent>
          {filteredChains.map((chain) => (
            <SelectItem
              key={chain.value}
              value={chain.value}
              disabled={!chain.enabled}
            >
              <div className="flex items-center gap-2">
                <span>{chain.icon}</span>
                {chain.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}