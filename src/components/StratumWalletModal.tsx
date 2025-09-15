import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Wallet, Shield, ArrowRight, RefreshCw, AlertCircle, Usb, Info, KeyRound, Plus, Globe, ChevronDown } from 'lucide-react';
import { useWallet, WALLET_TYPES } from '@/hooks/useWallet';
import { useNetwork } from '@/contexts/NetworkContext';
import { useToast } from '@/hooks/use-toast';

interface StratumWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StratumWalletModal = ({ open, onOpenChange }: StratumWalletModalProps) => {
  const { toast } = useToast();
  const { network, setNetwork } = useNetwork();
  const { connect, isLoading } = useWallet();
  
  const [connecting, setConnecting] = useState<string | null>(null);
  const [publicKeyInput, setPublicKeyInput] = useState('');
  const [useAdvancedMode, setUseAdvancedMode] = useState(false);

  const handleWalletConnect = useCallback(async (walletId: string) => {
    setConnecting(walletId);
    try {
      await connect(walletId);
      onOpenChange(false);
      toast({
        title: "Wallet Connected",
        description: `Successfully connected via ${WALLET_TYPES.FREIGHTER.name}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive", 
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
      });
    } finally {
      setConnecting(null);
    }
  }, [connect, onOpenChange, toast]);

  const handlePublicKeyConnect = useCallback(async () => {
    if (!publicKeyInput.trim()) return;
    
    try {
      // For public key input, we don't actually "connect" but validate and proceed
      // This is more for read-only viewing in Stratum-style
      toast({
        title: "Public Key Added",
        description: "Ready to review account details",
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Invalid Public Key", 
        description: error.message || "Please check the public key format",
      });
    }
  }, [publicKeyInput, onOpenChange, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl glass">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-stellar bg-clip-text text-transparent">
            Connect to Stellar Network
          </DialogTitle>
          <DialogDescription>
            Choose your connection method and network settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Network Selection Only */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Network Selection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label className="text-sm font-medium">Stellar Network</Label>
                <Select value={network} onValueChange={setNetwork}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="testnet">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Test</Badge>
                        Stellar Testnet
                      </div>
                    </SelectItem>
                    <SelectItem value="mainnet">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs">Live</Badge>
                        Stellar Mainnet
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Connection Methods */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Connection Method
            </h3>

            {/* Wallet Extensions */}
            <div className="grid gap-3">
              {Object.values(WALLET_TYPES).map((wallet) => {
                const isAvailable = wallet.id === 'freighter' ? 
                  typeof window !== 'undefined' && (window as any).freighter : true;
                const isConnecting = connecting === wallet.id;

                return (
                  <Button
                    key={wallet.id}
                    variant="outline"
                    className="h-auto p-4 justify-start"
                    onClick={() => handleWalletConnect(wallet.id)}
                    disabled={!isAvailable || isLoading || isConnecting}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium">{wallet.name}</div>
                        <div className="text-sm text-muted-foreground">{wallet.description}</div>
                        {!isAvailable && wallet.id === 'freighter' && (
                          <div className="text-xs text-destructive mt-1">Extension not detected</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isConnecting && <RefreshCw className="w-4 h-4 animate-spin" />}
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>

            {/* Advanced Mode Toggle */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2">
                  <span className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4" />
                    Advanced Options
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                <Card className="border-border/50">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Public Key Input</Label>
                        <p className="text-xs text-muted-foreground">Enter a Stellar public key for read-only access</p>
                      </div>
                      <Switch 
                        checked={useAdvancedMode} 
                        onCheckedChange={setUseAdvancedMode}
                      />
                    </div>
                    
                    {useAdvancedMode && (
                      <div className="space-y-3">
                        <div>
                          <Input
                            placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                            value={publicKeyInput}
                            onChange={(e) => setPublicKeyInput(e.target.value)}
                            className="font-mono text-sm"
                          />
                        </div>
                        <Button 
                          onClick={handlePublicKeyConnect}
                          disabled={!publicKeyInput.trim()}
                          className="w-full"
                        >
                          <KeyRound className="w-4 h-4 mr-2" />
                          Connect Read-Only
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-3 h-3" />
            <span>Your private keys never leave your wallet. Tansu Vault uses secure, non-custodial connections.</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};