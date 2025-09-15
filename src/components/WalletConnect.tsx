import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, Shield, Sparkles, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWallet, WALLET_TYPES } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';

// Extend Window interface for Stellar wallet extensions
declare global {
  interface Window {
    freighter?: any;
  }
}

export const WalletConnect = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { address, isConnected, isLoading, error, connect, disconnect } = useWallet();
  const { toast } = useToast();

  const walletOptions = [
    {
      ...WALLET_TYPES.FREIGHTER,
      icon: Wallet,
      available: typeof window !== 'undefined' && !!window.freighter,
    },
    {
      ...WALLET_TYPES.LOBSTR,
      icon: Shield,
      available: true,
    },
    {
      ...WALLET_TYPES.RABET,
      icon: Sparkles,
      available: true,
    },
  ];

  const handleConnect = async (walletId: string) => {
    try {
      await connect(walletId);
      setIsOpen(false);
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

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="bg-gradient-stellar text-primary-foreground border-0">
          <CheckCircle className="mr-1 h-3 w-3" />
          {address?.slice(0, 4)}...{address?.slice(-4)}
        </Badge>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleDisconnect}
          className="text-muted-foreground hover:text-foreground"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-gradient-stellar text-primary-foreground border-0 glow-stellar hover:shadow-stellar transition-all duration-300">
          <Wallet className="mr-2 h-4 w-4" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="glass">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-stellar bg-clip-text text-transparent">
            Connect Your Stellar Wallet
          </DialogTitle>
          <DialogDescription>
            Choose your preferred Stellar wallet to connect to Tansu Vault
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 mt-4">
          {walletOptions.map((wallet) => (
            <Card 
              key={wallet.name}
              className={cn(
                "cursor-pointer transition-all duration-300 hover:shadow-elevation border-border/50",
                wallet.available ? "hover:bg-surface-elevated" : "opacity-50 cursor-not-allowed"
              )}
              onClick={() => wallet.available && handleConnect(wallet.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-stellar">
                    <wallet.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{wallet.name}</CardTitle>
                    <CardDescription>{wallet.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
        
        <p className="text-xs text-muted-foreground text-center mt-4">
          Make sure you're on the Stellar network before connecting
        </p>
      </DialogContent>
    </Dialog>
  );
};