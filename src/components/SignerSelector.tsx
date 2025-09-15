import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,  
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Wallet, Shield, Smartphone, Monitor, Check, AlertTriangle } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useNetwork } from '@/contexts/NetworkContext';
import { getSupportedWallets } from '@/lib/walletKit';
import { formatAddress } from '@/lib/validation';
import type { ISupportedWallet } from '@creit.tech/stellar-wallets-kit';

interface SignerSelectorProps {
  selectedSigner?: string;
  onSignerChange: (signer: string, walletId: string) => void;
  disabled?: boolean;
  className?: string;
}

export const SignerSelector: React.FC<SignerSelectorProps> = ({
  selectedSigner,
  onSignerChange,
  disabled = false,
  className
}) => {
  const { address, isConnected } = useWallet();
  const { network } = useNetwork();
  const [availableWallets, setAvailableWallets] = useState<ISupportedWallet[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load available wallets
  useEffect(() => {
    const loadWallets = async () => {
      try {
        const wallets = await getSupportedWallets(network === 'mainnet' ? 'mainnet' : 'testnet');
        setAvailableWallets(wallets);
      } catch (error) {
        console.error('Failed to load wallets:', error);
        setAvailableWallets([]);
      }
    };

    loadWallets();
  }, [network]);

  // Get wallet icon
  const getWalletIcon = (wallet: any) => {
    const isHardware = wallet.id.toLowerCase().includes('ledger') || 
                      wallet.id.toLowerCase().includes('trezor');
    const isMobile = wallet.id.toLowerCase().includes('xbull') || 
                    wallet.id.toLowerCase().includes('hot');
    
    if (isHardware) return <Shield className="w-4 h-4" />;
    if (isMobile) return <Smartphone className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  // Get wallet description
  const getWalletDescription = (wallet: any) => {
    const isHardware = wallet.id.toLowerCase().includes('ledger') || 
                      wallet.id.toLowerCase().includes('trezor');
    if (isHardware) return 'Hardware wallet - Most secure';
    if (wallet.id.toLowerCase().includes('xbull')) return 'Mobile wallet';
    if (wallet.id.toLowerCase().includes('freighter')) return 'Browser extension';
    return 'Wallet';
  };

  const handleWalletSelect = (walletId: string) => {
    const wallet = availableWallets.find(w => w.id === walletId);
    if (wallet) {
      onSignerChange(wallet.name, walletId);
      setIsModalOpen(false);
    }
  };

  // If connected, show current connection option first
  const signerOptions = [
    ...(isConnected && address ? [{
      id: 'current',
      name: 'Current Connection',
      address,
      isConnected: true
    }] : []),
    ...availableWallets.map(wallet => ({
      id: wallet.id,
      name: wallet.name,
      address: '',
      isConnected: false
    }))
  ];

  return (
    <div className={className}>
      <Label className="text-sm font-medium mb-2 block">
        Transaction Signer
      </Label>
      
      <Select
        value={selectedSigner}
        onValueChange={(value) => {
          const option = signerOptions.find(opt => opt.name === value);
          if (option) {
            onSignerChange(value, option.id);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger className="flex items-center gap-2">
          <SelectValue placeholder="Choose wallet to sign transaction" />
        </SelectTrigger>
        <SelectContent>
          {signerOptions.map((option) => (
            <SelectItem key={option.id} value={option.name}>
              <div className="flex items-center gap-2">
                {option.isConnected ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  getWalletIcon(option)
                )}
                <div className="text-left">
                  <div className="font-medium">{option.name}</div>
                  {option.address && (
                    <div className="text-xs text-muted-foreground font-mono">
                      {formatAddress(option.address)}
                    </div>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Additional options */}
      <div className="flex justify-between items-center mt-2">
        <div className="text-xs text-muted-foreground">
          {selectedSigner ? (
            `Using ${selectedSigner} for signing`
          ) : (
            'Select a wallet to sign transactions'
          )}
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs h-6">
              More Options
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Select Signing Wallet</DialogTitle>
              <DialogDescription>
                Choose which wallet will sign your transactions
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 mt-4">
              {/* Current connection */}
              {isConnected && address && (
                <div className="p-3 border rounded-lg bg-success/5 border-success/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-success" />
                      <div>
                        <div className="font-medium">Current Connection</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {formatAddress(address)}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onSignerChange('Current Connection', 'current')}
                    >
                      Use This
                    </Button>
                  </div>
                </div>
              )}

              {/* Available wallets */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Available Wallets</div>
                {availableWallets.map((wallet) => (
                  <div key={wallet.id} className="p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getWalletIcon(wallet)}
                        <div>
                          <div className="font-medium">{wallet.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {getWalletDescription(wallet)}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWalletSelect(wallet.id)}
                      >
                        Select
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {availableWallets.length === 0 && (
                <div className="p-4 text-center text-muted-foreground">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-sm">No wallets available</div>
                  <div className="text-xs">
                    Install a Stellar wallet extension to sign transactions
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Security notice */}
      {selectedSigner && (
        <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded text-xs">
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3 text-amber-600" />
            <span className="text-amber-800 dark:text-amber-200">
              Always verify transaction details before signing
            </span>
          </div>
        </div>
      )}
    </div>
  );
};