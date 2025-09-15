import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useWallet, WALLET_TYPES } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { NetworkSelector } from '@/components/NetworkSelector';
import { CurrencySelector } from '@/components/CurrencySelector';
import { Wallet, LogOut, Loader2, CheckCircle, Settings } from 'lucide-react';

export const WalletConnect: React.FC = () => {
  const { address, isConnected, isLoading, network, connect, disconnect, switchNetwork } = useWallet();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP'>('USD');

  const handleConnect = async (walletId: string) => {
    try {
      await connect(walletId);
      setIsDialogOpen(false);
      toast({
        title: "Wallet Connected",
        description: "Successfully connected to your Stellar wallet",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
      });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  // Connected state
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <NetworkSelector 
          currentNetwork={network} 
          onNetworkChange={switchNetwork}
          disabled={isLoading}
        />
        
        <CurrencySelector 
          currentCurrency={currency}
          onCurrencyChange={setCurrency}
          compact
        />
        
        <Badge variant="outline" className="flex items-center gap-2 px-3 py-1">
          <CheckCircle className="h-4 w-4 text-success" />
          <span className="font-mono text-sm">
            {`${address.slice(0, 4)}...${address.slice(-4)}`}
          </span>
        </Badge>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Disconnect
        </Button>
      </div>
    );
  }

  // Disconnected state
  return (
    <div className="flex items-center gap-3">
      <NetworkSelector 
        currentNetwork={network} 
        onNetworkChange={switchNetwork}
        disabled={isLoading}
      />
      
      <CurrencySelector 
        currentCurrency={currency}
        onCurrencyChange={setCurrency}
        compact
      />
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            Connect Wallet
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Your Wallet</DialogTitle>
            <DialogDescription>
              Choose a wallet to connect to Tansu Vault on {network}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 mt-4">
            {Object.values(WALLET_TYPES).map((wallet) => {
              const isFreighterAvailable = wallet.id === 'freighter' ? typeof window !== 'undefined' && (window as any).freighter : true;
              
              return (
                <Button
                  key={wallet.id}
                  variant="outline"
                  className="flex items-center justify-start gap-3 h-auto p-4"
                  onClick={() => handleConnect(wallet.id)}
                  disabled={!isFreighterAvailable || isLoading}
                >
                  <div className="flex-1 text-left">
                    <div className="font-medium">{wallet.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {wallet.description}
                    </div>
                    {!isFreighterAvailable && wallet.id === 'freighter' && (
                      <div className="text-xs text-destructive mt-1">
                        Extension not detected
                      </div>
                    )}
                  </div>
                  {isLoading && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};