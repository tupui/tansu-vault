import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
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
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Key,
  Globe,
  Zap,
  Shield,
  Smartphone,
  Monitor
} from 'lucide-react';
import { isValidPublicKey, sanitizeError, isValidDomain } from '@/lib/validation';
import { resolveSorobanDomain } from '@/lib/soroban-domains';
import { useNetwork } from '@/contexts/NetworkContext';

// Wallet configurations matching Stellar-Stratum
interface WalletConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  isHardware?: boolean;
  detectAvailability?: () => boolean;
}

const WALLET_CONFIGS: WalletConfig[] = [
  {
    id: 'freighter',
    name: 'Freighter',
    description: 'Available',
    icon: <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center"><Zap className="w-4 h-4 text-white" /></div>,
    detectAvailability: () => typeof window !== 'undefined' && !!(window as any).freighter
  },
  {
    id: 'xbull',
    name: 'xBull',
    description: 'Available',
    icon: <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">X</div>,
    detectAvailability: () => typeof window !== 'undefined' && !!(window as any).xBullWalletConnect
  },
  {
    id: 'ledger',
    name: 'Ledger',
    description: 'Hardware wallet',
    icon: <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center"><Shield className="w-4 h-4 text-white" /></div>,
    isHardware: true,
    detectAvailability: () => true
  },
  {
    id: 'lobstr',
    name: 'LOBSTR',
    description: 'Available',
    icon: <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">L</div>,
    detectAvailability: () => true
  },
  {
    id: 'hot',
    name: 'HOT Wallet',
    description: 'Available',
    icon: <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">H</div>,
    detectAvailability: () => true
  },
  {
    id: 'albedo',
    name: 'Albedo',
    description: 'Available',
    icon: <div className="w-8 h-8 bg-blue-400 rounded-lg flex items-center justify-center text-white font-bold text-sm">A</div>,
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
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showMoreWallets, setShowMoreWallets] = useState(false);
  
  // Input states
  const [manualAddress, setManualAddress] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [resolvingDomain, setResolvingDomain] = useState(false);

  // Device detection
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Get available wallets
  const availableWallets = WALLET_CONFIGS.map(config => ({
    ...config,
    isAvailable: config.detectAvailability?.() ?? true
  }));

  const primaryWallets = availableWallets.slice(0, 3);
  const secondaryWallets = availableWallets.slice(3);

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
        
        <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-800 text-white max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Wallet className="h-5 w-5" />
              Connect Wallet
            </DialogTitle>
          </DialogHeader>
          
          {/* Network Toggle - Stratum Style */}
          <div className="flex-shrink-0 mb-6">
            <div className="bg-gray-800 rounded-full p-1 flex mx-auto w-fit">
              <button
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedNetwork === 'mainnet'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setSelectedNetwork('mainnet')}
              >
                Mainnet
              </button>
              <button
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedNetwork === 'testnet'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setSelectedNetwork('testnet')}
              >
                Testnet
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {/* Manual Address Entry */}
            <button
              className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors group"
              onClick={() => {
                const address = prompt("Enter Stellar public key:");
                if (address) {
                  setManualAddress(address);
                  handleManualConnect();
                }
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <Key className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Enter address manually</div>
                  <div className="text-sm text-gray-400">View any account by public key</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            </button>

            {/* Soroban Domains */}
            <button
              className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors group"
              onClick={() => {
                const domain = prompt("Enter Soroban domain:");
                if (domain) {
                  setDomainInput(domain);
                  handleDomainConnect();
                }
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Soroban Domains</div>
                  <div className="text-sm text-gray-400">Resolve domain to address</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            </button>

            {/* Primary Wallets */}
            {primaryWallets.map((wallet) => (
              <button
                key={wallet.id}
                className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleWalletConnect(wallet.id, wallet.name)}
                disabled={!wallet.isAvailable || connecting === wallet.id}
              >
                <div className="flex items-center gap-3">
                  {wallet.icon}
                  <div className="text-left">
                    <div className="font-medium">{wallet.name}</div>
                    <div className="text-sm text-gray-400">{wallet.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {connecting === wallet.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  )}
                </div>
              </button>
            ))}

            {/* Secondary Wallets */}
            {secondaryWallets.length > 0 && (
              <Collapsible open={showMoreWallets} onOpenChange={setShowMoreWallets}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-center gap-2 py-3 text-yellow-500 hover:text-yellow-400 transition-colors font-medium">
                    See more wallets ({secondaryWallets.length})
                    {showMoreWallets ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3">
                  {secondaryWallets.map((wallet) => (
                    <button
                      key={wallet.id}
                      className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleWalletConnect(wallet.id, wallet.name)}
                      disabled={!wallet.isAvailable || connecting === wallet.id}
                    >
                      <div className="flex items-center gap-3">
                        {wallet.icon}
                        <div className="text-left">
                          <div className="font-medium">{wallet.name}</div>
                          <div className="text-sm text-gray-400">{wallet.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {connecting === wallet.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                        )}
                      </div>
                    </button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};