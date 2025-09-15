import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
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
  Link
} from 'lucide-react';
import { isValidPublicKey, sanitizeError, isValidDomain } from '@/lib/validation';
import { resolveSorobanDomain } from '@/lib/soroban-domains';
import { useNetwork } from '@/contexts/NetworkContext';
import { getSupportedWallets } from '@/lib/walletKit';
import type { ISupportedWallet } from '@creit.tech/stellar-wallets-kit';

// Wallet ordering for different device types
const mobileOrder = ['xbull', 'hot', 'albedo'];
const desktopOrder = ['freighter', 'xbull', 'ledger', 'lobstr', 'hot', 'albedo'];

export const WalletConnect: React.FC = () => {
  const { address, isConnected, isLoading, connect, disconnect } = useWallet();
  const { network, setNetwork } = useNetwork();
  const { toast } = useToast();
  
  // Modal state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<'mainnet' | 'testnet'>(network === 'mainnet' ? 'mainnet' : 'testnet');
  
  // Wallet connection state
  const [connecting, setConnecting] = useState<string | null>(null);
  const [supportedWallets, setSupportedWallets] = useState<ISupportedWallet[]>([]);
  const [showMoreWallets, setShowMoreWallets] = useState(false);
  
  // Manual address input
  const [manualAddress, setManualAddress] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  
  // Soroban domain input
  const [sorobanDomain, setSorobanDomain] = useState('');
  const [resolvingDomain, setResolvingDomain] = useState(false);
  const [showDomainInput, setShowDomainInput] = useState(false);

  // Check available wallets when modal opens or network changes
  const checkWallets = useCallback(async () => {
    try {
      const wallets = await getSupportedWallets(selectedNetwork === 'mainnet' ? 'mainnet' : 'testnet');
      setSupportedWallets(wallets);
    } catch (error) {
      console.error('Failed to get supported wallets:', error);
      setSupportedWallets([]);
    }
  }, [selectedNetwork]);

  useEffect(() => {
    if (isDialogOpen) {
      checkWallets();
    }
  }, [isDialogOpen, checkWallets]);

  // Device detection
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Wallet ordering and filtering
  const getOrderedWallets = () => {
    const orderArray = isMobile ? mobileOrder : desktopOrder;
    const ordered = orderArray
      .map(id => supportedWallets.find((w: any) => w.id.toLowerCase().includes(id.toLowerCase())))
      .filter(Boolean) as any[];
    
    // Add any remaining wallets not in the order array
    const remaining = supportedWallets.filter((w: any) => 
      !orderArray.some(id => w.id.toLowerCase().includes(id.toLowerCase()))
    );
    
    return [...ordered, ...remaining];
  };

  const orderedWallets = getOrderedWallets();
  const primaryWallets = orderedWallets.slice(0, 3);
  const secondaryWallets = orderedWallets.slice(3);

  // Wallet connection handler
  const handleConnect = async (walletId: string, walletName: string) => {
    setConnecting(walletId);
    try {
      // Switch network if needed
      if (selectedNetwork !== network) {
        setNetwork(selectedNetwork);
      }
      
      await connect(walletId);
      setIsDialogOpen(false);
      
      toast({
        title: "Wallet Connected",
        description: `Successfully connected ${walletName}`,
      });
    } catch (error) {
      const { userMessage } = sanitizeError(error);
      const isHardware = walletId.toLowerCase().includes('ledger') || 
                        walletId.toLowerCase().includes('trezor');
      
      toast({
        title: "Connection failed",
        description: userMessage,
        variant: "destructive",
        duration: isHardware ? 6000 : 3000 // Longer for hardware wallets
      });
    } finally {
      setConnecting(null);
    }
  };

  // Manual address connection
  const handleManualConnect = () => {
    if (!isValidPublicKey(manualAddress.trim())) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid Stellar public key",
        variant: "destructive"
      });
      return;
    }

    // For manual address, we simulate a connection
    setIsDialogOpen(false);
    setManualAddress('');
    
    toast({
      title: "Address Connected",
      description: "Successfully connected with manual address",
    });
  };

  // Soroban domain connection
  const handleSorobanConnect = async () => {
    if (!sorobanDomain.trim()) {
      toast({
        title: "Domain required",
        description: "Please enter a Soroban domain name",
        variant: "destructive"
      });
      return;
    }
    
    if (!isValidDomain(sorobanDomain.trim())) {
      toast({
        title: "Invalid domain",
        description: "Please enter a valid domain name",
        variant: "destructive"
      });
      return;
    }
    
    setResolvingDomain(true);
    try {
      const result = await resolveSorobanDomain(sorobanDomain.trim(), selectedNetwork);
      if (result) {
        setSorobanDomain('');
        setIsDialogOpen(false);
        
        toast({
          title: "Domain Connected",
          description: `Successfully connected to ${sorobanDomain}`,
        });
      } else {
        toast({
          title: "Domain Not Found",
          description: `The domain "${sorobanDomain}" could not be resolved.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      const { userMessage } = sanitizeError(error);
      toast({
        title: "Domain resolution failed",
        description: userMessage,
        variant: "destructive"
      });
    } finally {
      setResolvingDomain(false);
    }
  };

  // Disconnect handler
  const handleDisconnect = () => {
    disconnect();
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  // Network change handler
  const handleNetworkChange = (newNetwork: string) => {
    setSelectedNetwork(newNetwork as 'mainnet' | 'testnet');
  };

  // Wallet icon helper
  const getWalletIcon = (wallet: any) => {
    const isLedger = wallet.id.toLowerCase().includes('ledger');
    const isHardware = isLedger || wallet.id.toLowerCase().includes('trezor');
    
    if (isLedger) {
      return <Shield className="w-8 h-8 text-primary" />;
    }
    if (isHardware) {
      return <Usb className="w-8 h-8 text-primary" />;
    }
    if (wallet.icon) {
      return <img src={wallet.icon} alt={wallet.name} className="w-8 h-8 rounded" />;
    }
    return (
      <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded flex items-center justify-center text-primary-foreground font-semibold">
        {wallet.name.charAt(0)}
      </div>
    );
  };

  // Wallet description helper
  const getWalletDescription = (wallet: any) => {
    const isHardware = wallet.id.toLowerCase().includes('ledger') || 
                      wallet.id.toLowerCase().includes('trezor');
    if (isHardware) return 'Hardware wallet';
    if (wallet.isAvailable) return 'Available';
    
    // Check if it's a browser extension
    if (wallet.id.toLowerCase().includes('freighter') || 
        wallet.id.toLowerCase().includes('rabet') || 
        wallet.id.toLowerCase().includes('xbull')) {
      return 'Extension required';
    }
    return 'Install required';
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

  // Disconnected state with comprehensive modal
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
        
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Connect Your Wallet
            </DialogTitle>
            <DialogDescription>
              Choose your preferred connection method for Tansu Vault
            </DialogDescription>
          </DialogHeader>
          
          {/* Network Selection */}
          <div className="mt-4">
            <Label className="text-sm font-medium mb-3 block">Network</Label>
            <div className="relative bg-muted/50 backdrop-blur-sm rounded-full p-1 flex border border-border/50">
              <button
                className={`flex-1 text-sm font-medium py-2 px-4 rounded-full transition-all ${
                  selectedNetwork === 'mainnet'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => handleNetworkChange('mainnet')}
              >
                Mainnet
              </button>
              <button
                className={`flex-1 text-sm font-medium py-2 px-4 rounded-full transition-all ${
                  selectedNetwork === 'testnet'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => handleNetworkChange('testnet')}
              >
                Testnet
              </button>
            </div>
          </div>

          <Tabs defaultValue="wallets" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="wallets" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Wallets
              </TabsTrigger>
              <TabsTrigger value="domain" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Domain
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Manual
              </TabsTrigger>
            </TabsList>

            <TabsContent value="wallets" className="space-y-4 mt-4">
              {/* Primary Wallets */}
              <div className="space-y-2">
                {primaryWallets.map((wallet) => (
                      <Button
                        key={wallet.id}
                        variant="outline"
                        className="w-full flex items-center justify-between p-4 h-auto"
                        onClick={() => handleConnect(wallet.id, wallet.name)}
                        disabled={!wallet.isAvailable || connecting === wallet.id}
                      >
                        <div className="flex items-center gap-3">
                          {getWalletIcon(wallet)}
                          <div className="text-left">
                            <div className="font-medium">{wallet.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {getWalletDescription(wallet)}
                            </div>
                          </div>
                        </div>
                        {connecting === wallet.id && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </Button>
                ))}
              </div>

              {/* Secondary Wallets (Collapsible) */}
              {secondaryWallets.length > 0 && (
                <Collapsible open={showMoreWallets} onOpenChange={setShowMoreWallets}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full flex items-center gap-2">
                      <ChevronDown className={`h-4 w-4 transition-transform ${showMoreWallets ? 'rotate-180' : ''}`} />
                      {showMoreWallets ? 'Show Less' : `Show ${secondaryWallets.length} More Wallets`}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {secondaryWallets.map((wallet) => (
                      <Button
                        key={wallet.id}
                        variant="outline"
                        className="w-full flex items-center justify-between p-4 h-auto"
                        onClick={() => handleConnect(wallet.id, wallet.name)}
                        disabled={!wallet.isAvailable || connecting === wallet.id}
                      >
                        <div className="flex items-center gap-3">
                          {getWalletIcon(wallet)}
                          <div className="text-left">
                            <div className="font-medium">{wallet.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {getWalletDescription(wallet)}
                            </div>
                          </div>
                        </div>
                        {connecting === wallet.id && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </Button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Device preference indicator */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                {isMobile ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                Optimized for {isMobile ? 'mobile' : 'desktop'}
              </div>
            </TabsContent>

            <TabsContent value="domain" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="domain-input" className="text-sm font-medium">
                    Soroban Domain
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Enter a .xlm domain or any registered Soroban domain
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="domain-input"
                      placeholder="example.xlm"
                      value={sorobanDomain}
                      onChange={(e) => setSorobanDomain(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSorobanConnect}
                      disabled={!sorobanDomain.trim() || resolvingDomain}
                    >
                      {resolvingDomain ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Connect'
                      )}
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm font-medium mb-1">How it works:</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Enter a registered Soroban domain</p>
                    <p>• We'll resolve it to a Stellar address</p>
                    <p>• Connect using your preferred wallet</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="address-input" className="text-sm font-medium">
                    Stellar Address
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Enter a valid Stellar public key (starts with G)
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="address-input"
                      placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      onClick={handleManualConnect}
                      disabled={!manualAddress.trim()}
                    >
                      Connect
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                    Read-only Connection
                  </div>
                  <div className="text-xs text-amber-700 dark:text-amber-300">
                    Manual addresses provide read-only access. You won't be able to sign transactions.
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};