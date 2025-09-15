import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Shield, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// Extend Window interface for Freighter wallet
declare global {
  interface Window {
    freighter?: any;
  }
}

export const WalletConnect = () => {
  const [isOpen, setIsOpen] = useState(false);

  const walletOptions = [
    {
      name: 'Freighter',
      description: 'Browser extension wallet for Stellar',
      icon: Wallet,
      available: typeof window !== 'undefined' && !!window.freighter,
    },
    {
      name: 'Lobstr',
      description: 'Mobile-first Stellar wallet',
      icon: Shield,
      available: true,
    },
    {
      name: 'Rabet',
      description: 'Multi-chain wallet with Stellar support',
      icon: Sparkles,
      available: true,
    },
  ];

  const handleConnect = async (walletName: string) => {
    // TODO: Implement actual wallet connection logic
    console.log(`Connecting to ${walletName}...`);
    setIsOpen(false);
  };

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
              onClick={() => wallet.available && handleConnect(wallet.name)}
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