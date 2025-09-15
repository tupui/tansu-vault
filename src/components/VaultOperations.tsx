import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowDownLeft, ArrowUpRight, Loader2 } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { depositToVault, withdrawFromVault, formatAssetAmount } from '@/lib/stellar';

interface VaultOperationsProps {
  userBalance?: string;
  vaultBalance?: string;
  onOperationComplete?: () => void;
}

export const VaultOperations: React.FC<VaultOperationsProps> = ({
  userBalance = '0',
  vaultBalance = '0',
  onOperationComplete
}) => {
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { address, isConnected } = useWallet();
  const { toast } = useToast();

  const handleDeposit = async () => {
    if (!address || !depositAmount) return;
    
    setIsLoading(true);
    try {
      // Using native XLM asset for now
      const xlmAsset = { isNative: () => true };
      await depositToVault(address, depositAmount, xlmAsset as any);
      
      toast({
        title: "Deposit Successful",
        description: `Successfully deposited ${formatAssetAmount(depositAmount)} XLM to vault`,
      });
      
      setDepositAmount('');
      setIsDepositOpen(false);
      onOperationComplete?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Deposit Failed",
        description: error.message || "Failed to deposit to vault",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!address || !withdrawAmount) return;
    
    setIsLoading(true);
    try {
      await withdrawFromVault(address, withdrawAmount);
      
      toast({
        title: "Withdrawal Successful",
        description: `Successfully withdrew ${formatAssetAmount(withdrawAmount)} XLM from vault`,
      });
      
      setWithdrawAmount('');
      setIsWithdrawOpen(false);
      onOperationComplete?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Withdrawal Failed",
        description: error.message || "Failed to withdraw from vault",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle>Vault Operations</CardTitle>
          <CardDescription>
            Connect your wallet to deposit and withdraw funds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Please connect your Stellar wallet to access vault operations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <CardTitle>Vault Operations</CardTitle>
        <CardDescription>
          Manage your project treasury deposits and withdrawals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Balance Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 rounded-lg bg-surface-elevated/50">
            <p className="text-sm text-muted-foreground">Wallet Balance</p>
            <p className="text-lg font-semibold">{formatAssetAmount(userBalance)} XLM</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-surface-elevated/50">
            <p className="text-sm text-muted-foreground">Vault Balance</p>
            <p className="text-lg font-semibold text-vault-yield">{formatAssetAmount(vaultBalance)} XLM</p>
          </div>
        </div>

        {/* Operation Buttons */}
        <div className="flex gap-3">
          {/* Deposit Dialog */}
          <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
            <DialogTrigger asChild>
              <Button 
                className="flex-1 bg-deposit-blue/20 border-deposit-blue text-deposit-blue hover:bg-deposit-blue hover:text-primary-foreground"
                variant="outline"
              >
                <ArrowDownLeft className="mr-2 h-4 w-4" />
                Deposit
              </Button>
            </DialogTrigger>
            <DialogContent className="glass">
              <DialogHeader>
                <DialogTitle className="text-xl bg-gradient-stellar bg-clip-text text-transparent">
                  Deposit to Vault
                </DialogTitle>
                <DialogDescription>
                  Deposit XLM from your wallet to earn yield in the Tansu Vault
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="deposit-amount">Amount (XLM)</Label>
                  <Input
                    id="deposit-amount"
                    type="number"
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available: {formatAssetAmount(userBalance)} XLM
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsDepositOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeposit}
                    disabled={!depositAmount || isLoading}
                    className="flex-1 bg-deposit-blue hover:bg-deposit-blue/90"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Depositing...
                      </>
                    ) : (
                      'Confirm Deposit'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Withdraw Dialog */}
          <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
            <DialogTrigger asChild>
              <Button 
                className="flex-1 bg-withdraw-orange/20 border-withdraw-orange text-withdraw-orange hover:bg-withdraw-orange hover:text-primary-foreground"
                variant="outline"
              >
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Withdraw
              </Button>
            </DialogTrigger>
            <DialogContent className="glass">
              <DialogHeader>
                <DialogTitle className="text-xl bg-gradient-stellar bg-clip-text text-transparent">
                  Withdraw from Vault
                </DialogTitle>
                <DialogDescription>
                  Withdraw XLM from the Tansu Vault back to your wallet
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="withdraw-amount">Amount (XLM)</Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available: {formatAssetAmount(vaultBalance)} XLM
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsWithdrawOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleWithdraw}
                    disabled={!withdrawAmount || isLoading}
                    className="flex-1 bg-withdraw-orange hover:bg-withdraw-orange/90"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Withdrawing...
                      </>
                    ) : (
                      'Confirm Withdrawal'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};