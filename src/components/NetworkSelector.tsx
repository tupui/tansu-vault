import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Globe, TestTube } from 'lucide-react';
import { useNetwork } from '@/contexts/NetworkContext';

interface NetworkSelectorProps {
  disabled?: boolean;
}

export const NetworkSelector = ({ disabled = false }: NetworkSelectorProps) => {
  const { network, setNetwork } = useNetwork();

  const networks = [
    {
      value: 'testnet' as const,
      label: 'Testnet',
      icon: TestTube,
      description: 'Development & testing network'
    },
    {
      value: 'mainnet' as const,
      label: 'Mainnet',
      icon: Globe,
      description: 'Live production network'
    }
  ];

  const currentNetwork = networks.find(n => n.value === network) || networks[0];

  return (
    <div className="flex items-center gap-2">
      <Select
        value={network}
        onValueChange={(value: 'mainnet' | 'testnet') => setNetwork(value)}
        disabled={disabled}
      >
        <SelectTrigger className="w-[140px] bg-background/50 border-border/50">
          <div className="flex items-center gap-2">
            <currentNetwork.icon className="h-4 w-4" />
            <span className="font-medium">{currentNetwork.label}</span>
          </div>
        </SelectTrigger>
        <SelectContent>
          {networks.map((net) => (
            <SelectItem key={net.value} value={net.value}>
              <div className="flex items-center gap-2">
                <net.icon className="h-4 w-4" />
                <div>
                  <div className="font-medium">{net.label}</div>
                  <div className="text-xs text-muted-foreground">{net.description}</div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Badge variant="outline" className="text-xs">
        {network === 'testnet' ? 'Test' : 'Live'}
      </Badge>
    </div>
  );
};