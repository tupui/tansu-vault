import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNetwork } from '@/contexts/NetworkContext';

interface NetworkSelectorProps {
  disabled?: boolean;
}

export const NetworkSelector = ({ disabled = false }: NetworkSelectorProps) => {
  const { network, setNetwork } = useNetwork();

  return (
    <Select
      value={network}
      onValueChange={(value: 'testnet' | 'mainnet') => setNetwork(value)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[100px] bg-background/50 border-border/50">
        <Badge variant="outline" className="text-xs">
          {network === 'testnet' ? 'Testnet' : 'Mainnet'}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="testnet">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>Testnet</span>
          </div>
        </SelectItem>
        <SelectItem value="mainnet">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Mainnet</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};