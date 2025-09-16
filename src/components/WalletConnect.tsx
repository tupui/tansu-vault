import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { NetworkSelector } from '@/components/NetworkSelector';
import { CurrencySelector } from '@/components/CurrencySelector';
import { 
  Wallet, 
  LogOut, 
  Loader2, 
  CheckCircle, 
  Globe, 
  Smartphone, 
  Monitor, 
  Usb,
  ChevronDown,
  Shield,
  Link,
  Copy,
  ExternalLink
} from 'lucide-react';
import { isValidPublicKey, sanitizeError, isValidDomain } from '@/lib/validation';
import { resolveSorobanDomain } from '@/lib/soroban-domains';
import { useNetwork } from '@/contexts/NetworkContext';
import { getSupportedWallets } from '@/lib/walletKit';

// Wallet configurations with icons and descriptions
interface WalletConfig {
  id: string;
  name: string;
  description: string;
  icon?: string;
  isHardware?: boolean;
  isMobile?: boolean;
  isDesktop?: boolean;
  detectAvailability?: () => boolean;
}

const WALLET_CONFIGS: WalletConfig[] = [
  {
    id: 'freighter',
    name: 'Freighter',
    description: 'Browser extension wallet',
    isDesktop: true,
    detectAvailability: () => typeof window !== 'undefined' && !!(window as any).freighter
  },
  {
    id: 'xbull',
    name: 'xBull',
    description: 'Mobile & browser wallet',
    isMobile: true,
    isDesktop: true,
    detectAvailability: () => typeof window !== 'undefined' && !!(window as any).xBullWalletConnect
  },
  {
    id: 'ledger',
    name: 'Ledger',
    description: 'Hardware wallet',
    isHardware: true,
    detectAvailability: () => true // Always available, requires USB
  },
  {
    id: 'lobstr',
    name: 'Lobstr',
    description: 'Mobile wallet',
    isMobile: true,
    detectAvailability: () => true
  },
  {
    id: 'rabet',
    name: 'Rabet',
    description: 'Browser extension',
    isDesktop: true,
    detectAvailability: () => typeof window !== 'undefined' && !!(window as any).rabet
  },
  {
    id: 'albedo',
    name: 'Albedo',
    description: 'Web-based wallet',
    detectAvailability: () => true
  }
];

export const WalletConnect: React.FC = () => {
  const { address, isConnected, isLoading, connect, disconnect } = useWallet();
  const { network, setNetwork } = useNetwork();
  const { toast } = useToast();
  
  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<'mainnet' | 'testnet'>(network === 'mainnet' ? 'mainnet' : 'testnet');
  
  // Connection state
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  
  // Input states
  const [manualAddress, setManualAddress] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [resolvingDomain, setResolvingDomain] = useState(false);

  // Device detection
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Get available wallets with proper ordering
  const getAvailableWallets = useCallback(() => {
    return WALLET_CONFIGS.map(config => ({
      ...config,
      isAvailable: config.detectAvailability?.() ?? true
    })).sort((a, b) => {
      // Prioritize available wallets
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;
      
      // Device-specific ordering
      if (isMobile) {
        if (a.isMobile && !b.isMobile) return -1;
        if (!a.isMobile && b.isMobile) return 1;
      } else {
        if (a.isDesktop && !b.isDesktop) return -1;
        if (!a.isDesktop && b.isDesktop) return 1;
      }
      
      return 0;
    });
  }, [isMobile]);

  const availableWallets = getAvailableWallets();
  const primaryWallets = availableWallets.slice(0, isMobile ? 4 : 6);
  const secondaryWallets = availableWallets.slice(isMobile ? 4 : 6);

  // Connection handlers
  const handleWalletConnect = async (walletId: string, walletName: string) => {
    setConnecting(walletId);
    try {
      if (selectedNetwork !== network) {
        setNetwork(selectedNetwork);
      }
      
      await connect(walletId);
      setIsOpen(false);
      
      toast({
        title: "Wallet Connected",
        description: `Successfully connected to ${walletName}`,
      });
    } catch (error) {
      const { userMessage } = sanitizeError(error);
      toast({
        title: "Connection Failed",
        description: userMessage,
        variant: "destructive",
      });
    } finally {
      setConnecting(null);
    }
  };

  const handleManualConnect = () => {
    if (!isValidPublicKey(manualAddress.trim())) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Stellar public key",
        variant: "destructive"
      });
      return;
    }
    
    setIsOpen(false);
    setManualAddress('');
    toast({
      title: "Address Connected",
      description: "Successfully connected with manual address",
    });
  };

  const handleDomainConnect = async () => {
    if (!domainInput.trim()) return;
    
    if (!isValidDomain(domainInput.trim())) {
      toast({
        title: "Invalid Domain",
        description: "Please enter a valid domain name",
        variant: "destructive"
      });
      return;
    }
    
    setResolvingDomain(true);
    try {
      const result = await resolveSorobanDomain(domainInput.trim(), selectedNetwork);
      if (result) {
        setDomainInput('');
        setIsOpen(false);
        toast({
          title: "Domain Connected",
          description: `Successfully resolved ${domainInput}`,
        });
      } else {
        toast({
          title: "Domain Not Found",
          description: `Could not resolve "${domainInput}"`,
          variant: "destructive"
        });
      }
    } catch (error) {
      const { userMessage } = sanitizeError(error);
      toast({
        title: "Resolution Failed",
        description: userMessage,
        variant: "destructive"
      });
    } finally {
      setResolvingDomain(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast({
      title: "Disconnected",
      description: "Wallet has been disconnected",
    });
  };

  // Helper functions
  const getWalletIcon = (wallet: WalletConfig & { isAvailable: boolean }) => {
    if (wallet.isHardware) {
      return <Shield className="w-5 h-5 text-primary" />;
    }
    if (wallet.icon) {
      return <img src={wallet.icon} alt={wallet.name} className="w-5 h-5 rounded" />;
    }
    return (
      <div className="w-5 h-5 bg-gradient-to-br from-primary to-primary/70 rounded-sm flex items-center justify-center text-[10px] text-primary-foreground font-bold">
        {wallet.name.charAt(0)}
      </div>
    );
  };

  const getWalletStatus = (wallet: WalletConfig & { isAvailable: boolean }) => {
    if (wallet.isHardware) return 'Hardware';
    if (wallet.isAvailable) return 'Ready';
    return 'Install';
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

  // Disconnected state with modal
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
        
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </DialogTitle>
            <DialogDescription className="text-xs">
              Choose your connection method for Tansu Vault
            </DialogDescription>
          </DialogHeader>
          
          {/* Network Toggle */}
          <div className="flex-shrink-0 mb-4">
            <div className="bg-muted/50 rounded-lg p-1 flex">
              <button
                className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-all ${
                  selectedNetwork === 'mainnet'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setSelectedNetwork('mainnet')}
              >
                Mainnet
              </button>
              <button
                className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-all ${
                  selectedNetwork === 'testnet'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setSelectedNetwork('testnet')}
              >
                Testnet
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <Tabs defaultValue="wallets" className="h-full">
              <TabsList className="grid w-full grid-cols-3 h-8 text-xs">
                <TabsTrigger value="wallets" className="flex items-center gap-1 text-xs">
                  <Wallet className="h-3 w-3" />
                  Wallets
                </TabsTrigger>
                <TabsTrigger value="domain" className="flex items-center gap-1 text-xs">
                  <Globe className="h-3 w-3" />
                  Domain
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-1 text-xs">
                  <Link className="h-3 w-3" />
                  Manual
                </TabsTrigger>
              </TabsList>

              <TabsContent value="wallets" className="space-y-2 mt-3">
                {/* Primary Wallets */}
                <div className="grid grid-cols-1 gap-2">
                  {primaryWallets.map((wallet) => (
                    <Button
                      key={wallet.id}
                      variant="outline"
                      className="h-auto p-3 justify-start"
                      onClick={() => handleWalletConnect(wallet.id, wallet.name)}
                      disabled={!wallet.isAvailable || connecting === wallet.id}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          {getWalletIcon(wallet)}
                          <div className="text-left">
                            <div className="text-sm font-medium">{wallet.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {wallet.description}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={wallet.isAvailable ? "default" : "secondary"} 
                            className="text-[10px] px-1.5 py-0.5"
                          >
                            {getWalletStatus(wallet)}
                          </Badge>
                          {connecting === wallet.id && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>

                {/* Secondary Wallets */}
                {secondaryWallets.length > 0 && (
                  <Collapsible open={showMore} onOpenChange={setShowMore}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full text-xs h-8">
                        <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${showMore ? 'rotate-180' : ''}`} />
                        {showMore ? 'Show Less' : `${secondaryWallets.length} More Wallets`}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {secondaryWallets.map((wallet) => (
                        <Button
                          key={wallet.id}
                          variant="outline"
                          className="h-auto p-3 justify-start"
                          onClick={() => handleWalletConnect(wallet.id, wallet.name)}
                          disabled={!wallet.isAvailable || connecting === wallet.id}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              {getWalletIcon(wallet)}
                              <div className="text-left">
                                <div className="text-sm font-medium">{wallet.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {wallet.description}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={wallet.isAvailable ? "default" : "secondary"} 
                                className="text-[10px] px-1.5 py-0.5"
                              >
                                {getWalletStatus(wallet)}
                              </Badge>
                              {connecting === wallet.id && (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              )}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Device indicator */}
                <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground pt-2 border-t mt-3">
                  {isMobile ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                  Optimized for {isMobile ? 'mobile' : 'desktop'}
                </div>
              </TabsContent>

              <TabsContent value="domain" className="space-y-3 mt-3">
                <div>
                  <Label htmlFor="domain" className="text-xs font-medium">
                    Soroban Domain
                  </Label>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Enter a .xlm domain or registered Soroban domain
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="domain"
                      placeholder="project.xlm"
                      value={domainInput}
                      onChange={(e) => setDomainInput(e.target.value)}
                      className="text-sm h-9"
                      onKeyDown={(e) => e.key === 'Enter' && handleDomainConnect()}
                    />
                    <Button
                      onClick={handleDomainConnect}
                      disabled={!domainInput.trim() || resolvingDomain}
                      size="sm"
                      className="px-3 h-9"
                    >
                      {resolvingDomain ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Connect'
                      )}
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs font-medium mb-1">How it works:</div>
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <p>• Enter a registered Soroban domain</p>
                    <p>• We resolve it to a Stellar address</p>
                    <p>• Connect using your preferred wallet</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="manual" className="space-y-3 mt-3">
                <div>
                  <Label htmlFor="address" className="text-xs font-medium">
                    Stellar Address
                  </Label>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Enter a valid Stellar public key (G...)
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="address"
                      placeholder="GXXXXXXXXX..."
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      className="text-sm h-9 font-mono"
                      onKeyDown={(e) => e.key === 'Enter' && handleManualConnect()}
                    />
                    <Button
                      onClick={handleManualConnect}
                      disabled={!manualAddress.trim()}
                      size="sm"
                      className="px-3 h-9"
                    >
                      Connect
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs font-medium mb-1">Manual Connection:</div>
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <p>• Enter any valid Stellar public key</p>
                    <p>• Read-only access to account data</p>
                    <p>• Cannot sign transactions</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};