import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { NetworkSelector } from '@/components/NetworkSelector';
import { CurrencySelector } from '@/components/CurrencySelector';
import { StratumWalletModalLight } from '@/components/StratumWalletModalLight';
import { 
  Wallet, 
  LogOut, 
  Loader2, 
  CheckCircle
} from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
} from '@/components/ui/dialog';

export const WalletConnect: React.FC = () => {
  const { address, isConnected, isLoading, disconnect } = useWallet();
  const { toast } = useToast();
  
  // Modal state
  const [isOpen, setIsOpen] = useState(false);

  // Device detection
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handleDisconnect = () => {
    disconnect();
    toast({
      title: "Disconnected",
      description: "Wallet has been disconnected",
    });
  };

  // Connected state
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <NetworkSelector />
        <CurrencySelector compact />
        
        <Badge variant="outline" className="flex items-center gap-2 px-3 py-1.5 font-mono text-xs">
          <CheckCircle className="h-3 w-3 text-success" />
          {`${address.slice(0, 4)}...${address.slice(-4)}`}
        </Badge>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          className="flex items-center gap-1.5 px-3"
        >
          <LogOut className="h-3 w-3" />
          {!isMobile && "Disconnect"}
        </Button>
      </div>
    );
  }

  // Disconnected state with Stratum-style modal
  return (
    <div className="flex items-center gap-2">
      <NetworkSelector />
      <CurrencySelector compact />
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="flex items-center gap-2 px-4">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            {!isMobile && "Connect"}
          </Button>
        </DialogTrigger>
        
        <StratumWalletModalLight open={isOpen} onOpenChange={setIsOpen} />
      </Dialog>
    </div>
  );
};