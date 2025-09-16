import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Wallet, 
  ArrowRight, 
  RefreshCw, 
  ChevronDown,
  Zap,
  Shield,
  Smartphone
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useNetwork } from '@/contexts/NetworkContext';
import { useToast } from '@/hooks/use-toast';
import { WALLET_CONFIGS, getPrimaryWallets, getSecondaryWallets } from '@/lib/walletConfig';
import { sanitizeError } from '@/lib/validation';

interface StratumWalletModalLightProps {
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

export const StratumWalletModalLight = ({ open, onOpenChange }: StratumWalletModalLightProps) => {
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


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-background border max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Wallet className="h-5 w-5" />
            Connect Wallet
          </DialogTitle>
        </DialogHeader>
        
        {/* Network Toggle - Light Theme */}
        <div className="flex-shrink-0 mb-6">
          <div className="bg-muted rounded-full p-1 flex mx-auto w-fit">
            <button
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                selectedNetwork === 'mainnet'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setSelectedNetwork('mainnet')}
            >
              Mainnet
            </button>
            <button
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                selectedNetwork === 'testnet'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setSelectedNetwork('testnet')}
            >
              Testnet
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">


          {/* Primary Wallets */}
          {primaryWallets.map((wallet) => {
            const isAvailable = wallet.detectAvailability?.() ?? true;
            const isConnecting = connecting === wallet.id;
            
            // Proper wallet status detection
            let statusText = 'Available';
            if (wallet.type === 'extension') {
              if (wallet.id === 'freighter') {
                statusText = isAvailable ? 'Extension detected' : 'Install extension';
              } else if (wallet.id === 'xbull') {
                statusText = isAvailable ? 'Extension detected' : 'Mobile/QR available';
              } else if (wallet.id === 'rabet') {
                statusText = isAvailable ? 'Extension detected' : 'Install extension';
              } else if (wallet.id === 'hana') {
                statusText = isAvailable ? 'Extension detected' : 'Install extension';
              } else {
                statusText = isAvailable ? 'Available' : 'Install extension';
              }
            } else if (wallet.type === 'hardware') {
              statusText = 'Connect via USB/Bluetooth';
            } else if (wallet.type === 'mobile') {
              statusText = 'Mobile/QR available';
            } else {
              statusText = 'Available';
            }

            return (
              <button
                key={wallet.id}
                className="w-full flex items-center justify-between p-4 bg-muted hover:bg-muted/80 rounded-xl transition-colors group"
                onClick={() => handleWalletConnect(wallet.id, wallet.name)}
                disabled={isLoading || isConnecting}
              >
                <div className="flex items-center gap-3">
                  {getWalletIcon(wallet.id)}
                  <div className="text-left">
                    <div className="font-medium">{wallet.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {statusText}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConnecting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                </div>
              </button>
            );
          })}

          {/* Secondary Wallets */}
          {secondaryWallets.length > 0 && (
            <Collapsible open={showMoreWallets} onOpenChange={setShowMoreWallets}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-center gap-2 py-3 text-primary hover:text-primary/80 transition-colors font-medium">
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
                      className="w-full flex items-center justify-between p-4 bg-muted hover:bg-muted/80 rounded-xl transition-colors group"
                      onClick={() => handleWalletConnect(wallet.id, wallet.name)}
                      disabled={isLoading || isConnecting}
                    >
                      <div className="flex items-center gap-3">
                        {getWalletIcon(wallet.id)}
                        <div className="text-left">
                          <div className="font-medium">{wallet.name}</div>
                          <div className="text-sm text-muted-foreground">Available</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isConnecting ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
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