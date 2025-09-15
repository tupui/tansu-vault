import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Globe, TestTube } from 'lucide-react';

export type Network = 'TESTNET' | 'MAINNET';

interface NetworkSelectorProps {
  currentNetwork: Network;
  onNetworkChange: (network: Network) => void;
  disabled?: boolean;
}

export const NetworkSelector = ({ currentNetwork, onNetworkChange, disabled }: NetworkSelectorProps) => {
  const networks = [
    {
      value: 'TESTNET' as Network,
      label: 'Testnet',
      icon: TestTube,
      description: 'For testing and development'
    },
    {
      value: 'MAINNET' as Network,
      label: 'Mainnet', 
      icon: Globe,
      description: 'Live network'
    }
  ];

  const currentNetworkData = networks.find(n => n.value === currentNetwork);
  const CurrentIcon = currentNetworkData?.icon || Globe;

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={currentNetwork === 'MAINNET' ? 'default' : 'secondary'}
        className="flex items-center gap-1"
      >
        <CurrentIcon className="h-3 w-3" />
        {currentNetworkData?.label}
      </Badge>
      
      <Select 
        value={currentNetwork} 
        onValueChange={onNetworkChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {networks.map((network) => {
            const Icon = network.icon;
            return (
              <SelectItem key={network.value} value={network.value}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <div>
                    <div className="font-medium">{network.label}</div>
                    <div className="text-xs text-muted-foreground">{network.description}</div>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};