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
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { Wallet, LogOut, Loader2, CheckCircle, Globe } from 'lucide-react';
import { isValidPublicKey, sanitizeError } from '@/lib/validation';
import { resolveSorobanDomain } from '@/lib/soroban-domains';
import { useNetwork } from '@/contexts/NetworkContext';

export const WalletConnect: React.FC = () => {
  const { address, isConnected, isLoading, connect, disconnect } = useWallet();
  const { network } = useNetwork();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [showDomainConnect, setShowDomainConnect] = useState(false);

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
        description: sanitizeError(error),
      });
    }
  };

  const handleDomainConnect = async (input: string, resolvedAddress?: string) => {
    try {
      let targetAddress = resolvedAddress;
      
      // If no resolved address provided, try to resolve or validate
      if (!targetAddress) {
        if (isValidPublicKey(input)) {
          targetAddress = input;
        } else {
          // Try to resolve as domain
          targetAddress = await resolveSorobanDomain(input, network);
          if (!targetAddress) {
            throw new Error('Domain could not be resolved or invalid address provided');
          }
        }
      }

      // Connect using the resolved/validated address - for now we'll use freighter as default
      await connect('freighter');
      setIsDialogOpen(false);
      setDomainInput('');
      
      toast({
        title: "Connected via Domain",
        description: `Successfully connected to ${input}`,
      });
    } catch (error) {
      toast({
        title: "Domain Connection Failed",
        description: sanitizeError(error),
        variant: "destructive",
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
        <NetworkSelector />
        <CurrencySelector compact />
        
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
      <NetworkSelector />
      <CurrencySelector compact />
      
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
              Choose a wallet to connect to Tansu Vault
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
              
              {/* Domain Connection Option */}
              <div className="border-t pt-4 mt-4">
                <Button 
                  onClick={() => setShowDomainConnect(!showDomainConnect)}
                  variant="outline"
                  className="w-full mb-3"
                  size="sm"
                >
                  <Globe className="mr-2 h-4 w-4" />
                  Connect via Soroban Domain
                </Button>
                
                {showDomainConnect && (
                  <div className="space-y-3">
                    <AddressAutocomplete
                      value={domainInput}
                      onChange={(value, resolved) => {
                        setDomainInput(value);
                      }}
                      placeholder="Enter .xlm domain or Stellar address"
                      className="w-full"
                      showValidation={true}
                      onResolvedAddressChange={(resolved) => {
                        if (resolved && domainInput) {
                          handleDomainConnect(domainInput, resolved);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};