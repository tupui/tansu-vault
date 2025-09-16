import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Wallet, 
  ArrowRight, 
  RefreshCw, 
  Info, 
  KeyRound, 
  Globe, 
  ChevronDown,
  Key,
  Zap,
  Shield,
  Smartphone,
  Monitor,
  HardDrive
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useNetwork } from '@/contexts/NetworkContext';
import { useToast } from '@/hooks/use-toast';
import { WALLET_CONFIGS, getPrimaryWallets, getSecondaryWallets } from '@/lib/walletConfig';
import { isValidPublicKey, isValidDomain, sanitizeError } from '@/lib/validation';
import { resolveSorobanDomain } from '@/lib/soroban-domains';

interface StratumWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Wallet icons mapping
const getWalletIcon = (walletId: string) => {
  switch (walletId) {
    case 'freighter':
      return <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><Zap className="w-4 h-4 text-white" /></div>;
    case 'xbull':
      return <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">X</div>;
    case 'ledger':
      return <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center"><Shield className="w-4 h-4 text-white" /></div>;
    case 'lobstr':
      return <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">L</div>;
    case 'rabet':
      return <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">R</div>;
    case 'hana':
      return <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">H</div>;
    case 'walletconnect':
      return <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center"><Smartphone className="w-4 h-4 text-white" /></div>;
    case 'albedo':
      return <div className="w-8 h-8 bg-blue-400 rounded-lg flex items-center justify-center text-white font-bold text-sm">A</div>;
    case 'hot':
      return <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">H</div>;
    default:
      return <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center"><Wallet className="w-4 h-4 text-white" /></div>;
  }
};

export const StratumWalletModal = ({ open, onOpenChange }: StratumWalletModalProps) => {
  const { toast } = useToast();
  const { network, setNetwork } = useNetwork();
  const { connect, isLoading } = useWallet();
  
  const [connecting, setConnecting] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<'mainnet' | 'testnet'>(
    network === 'mainnet' ? 'mainnet' : 'testnet'
  );
  const [showMoreWallets, setShowMoreWallets] = useState(false);

  const primaryWallets = getPrimaryWallets();
  const secondaryWallets = getSecondaryWallets();

  const handleWalletConnect = useCallback(async (walletId: string, walletName: string) => {
    setConnecting(walletId);
    try {
      // Switch network if needed
      if (selectedNetwork !== network) {
        setNetwork(selectedNetwork);
      }
      
      await connect(walletId);
      onOpenChange(false);
      
      toast({
        title: "Wallet Connected",
        description: `Successfully connected to ${walletName}`,
      });
    } catch (error: any) {
      const { userMessage } = sanitizeError(error);
      toast({
        variant: "destructive", 
        title: "Connection Failed",
        description: userMessage,
      });
    } finally {
      setConnecting(null);
    }
  }, [connect, onOpenChange, toast, selectedNetwork, network, setNetwork]);

  const handleManualAddressEntry = useCallback(() => {
    const address = prompt("Enter Stellar public key:");
    if (address) {
      if (!isValidPublicKey(address.trim())) {
        toast({
          variant: "destructive",
          title: "Invalid Address",
          description: "Please enter a valid Stellar public key",
        });
        return;
      }
      
      toast({
        title: "Address Added",
        description: "Ready to view account details",
      });
      onOpenChange(false);
    }
  }, [onOpenChange, toast]);

  const handleDomainResolution = useCallback(async () => {
    const domain = prompt("Enter Soroban domain:");
    if (domain) {
      if (!isValidDomain(domain.trim())) {
        toast({
          variant: "destructive",
          title: "Invalid Domain",
          description: "Please enter a valid domain name",
        });
        return;
      }
      
      try {
        const resolvedAddress = await resolveSorobanDomain(domain.trim(), selectedNetwork);
        if (resolvedAddress) {
          toast({
            title: "Domain Resolved",
            description: `Successfully resolved ${domain}`,
          });
          onOpenChange(false);
        } else {
          toast({
            variant: "destructive",
            title: "Domain Not Found",
            description: `Could not resolve "${domain}"`,
          });
        }
      } catch (error) {
        const { userMessage } = sanitizeError(error);
        toast({
          variant: "destructive",
          title: "Resolution Failed",
          description: userMessage,
        });
      }
    }
  }, [onOpenChange, toast, selectedNetwork]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            onClick={handleManualAddressEntry}
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
            onClick={handleDomainResolution}
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
          {primaryWallets.map((wallet) => {
            const isAvailable = wallet.detectAvailability?.() ?? true;
            const isConnecting = connecting === wallet.id;

            return (
              <button
                key={wallet.id}
                className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleWalletConnect(wallet.id, wallet.name)}
                disabled={!isAvailable || isLoading || isConnecting}
              >
                <div className="flex items-center gap-3">
                  {getWalletIcon(wallet.id)}
                  <div className="text-left">
                    <div className="font-medium">{wallet.name}</div>
                    <div className="text-sm text-gray-400">
                      {!isAvailable && wallet.id === 'freighter' ? 'Extension not detected' : 'Available'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConnecting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  )}
                </div>
              </button>
            );
          })}

          {/* Secondary Wallets */}
          {secondaryWallets.length > 0 && (
            <Collapsible open={showMoreWallets} onOpenChange={setShowMoreWallets}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-center gap-2 py-3 text-yellow-500 hover:text-yellow-400 transition-colors font-medium">
                  See more wallets ({secondaryWallets.length})
                  <ChevronDown className={`w-4 h-4 transition-transform ${showMoreWallets ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3">
                {secondaryWallets.map((wallet) => {
                  const isAvailable = wallet.detectAvailability?.() ?? true;
                  const isConnecting = connecting === wallet.id;

                  return (
                    <button
                      key={wallet.id}
                      className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleWalletConnect(wallet.id, wallet.name)}
                      disabled={!isAvailable || isLoading || isConnecting}
                    >
                      <div className="flex items-center gap-3">
                        {getWalletIcon(wallet.id)}
                        <div className="text-left">
                          <div className="font-medium">{wallet.name}</div>
                          <div className="text-sm text-gray-400">Available</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isConnecting ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};