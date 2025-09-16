import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Leaf, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  RefreshCw,
  ExternalLink,
  Coins,
  Target
} from 'lucide-react';
import { getFeeReceiverForCO2, getVaultAnalytics } from '@/lib/defindex-service';
import { useToast } from '@/hooks/use-toast';
import { getAccountBalances } from '@/lib/stellar';
import { useWallet } from '@/hooks/useWallet';

interface CO2OffsetData {
  feeReceiver: string;
  currentBalance: number;
  totalFeesCollected: number;
  feesAvailableForCO2: number;
  lastCollection: Date | null;
  carbonOffsetPotential: number; // Estimated CO2 tons that can be offset
  targetAmount: number; // Target amount for next offset purchase
}

interface CO2OffsetTrackerProps {
  className?: string;
}

export const CO2OffsetTracker: React.FC<CO2OffsetTrackerProps> = ({ className }) => {
  const { address } = useWallet();
  const [co2Data, setCo2Data] = useState<CO2OffsetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // CO2 offset rates (example rates - should be updated with real data)
  const CO2_OFFSET_RATE_XLM = 0.5; // XLM per ton of CO2
  const TARGET_CO2_TONS = 10; // Target tons of CO2 to offset

  const loadCO2Data = async () => {
    try {
      setLoading(true);
      setError(null);

      // Start with default values
      let feeReceiver = '';
      let currentBalance = 0;
      let totalFeesCollected = 0;
      let feesAvailableForCO2 = 0;

      // Try to get fee receiver address from DeFindex vault
      try {
        feeReceiver = await getFeeReceiverForCO2('testnet');
      } catch (err) {
        console.warn('Failed to get fee receiver:', err);
        feeReceiver = 'CBEEH4UPEYYJIT6INNYMXOXP5UTN6IBU3NKQFOFUYCZM2IHYITW6N22Z'; // Fallback from contract history
      }

      // Try to get current balance of fee receiver address
      if (feeReceiver) {
        try {
          const balances = await getAccountBalances(feeReceiver);
          const xlmBalance = balances.find(b => b.asset_type === 'native')?.balance || '0';
          currentBalance = parseFloat(xlmBalance);
        } catch (err) {
          console.warn('Failed to get fee receiver balance:', err);
          currentBalance = 0;
        }
      }

      // Try to get vault analytics for fee data (optional)
      try {
        const analytics = await getVaultAnalytics('testnet');
        const feeData = analytics.feeData;
        totalFeesCollected = parseFloat(feeData.totalFeesCollected) || 0;
        feesAvailableForCO2 = parseFloat(feeData.feesAvailableForCO2) || currentBalance;
      } catch (err) {
        console.warn('Failed to get vault analytics:', err);
        // Use current balance as available for CO2
        feesAvailableForCO2 = currentBalance;
      }

      const co2Data: CO2OffsetData = {
        feeReceiver,
        currentBalance,
        totalFeesCollected,
        feesAvailableForCO2,
        lastCollection: null, // TODO: Track collection dates
        carbonOffsetPotential: currentBalance / CO2_OFFSET_RATE_XLM,
        targetAmount: TARGET_CO2_TONS * CO2_OFFSET_RATE_XLM
      };

      setCo2Data(co2Data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load CO2 offset data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCO2Data();
    // Refresh data every 30 seconds
    const interval = setInterval(loadCO2Data, 30000);
    return () => clearInterval(interval);
  }, [address]);

  const formatNumber = (value: number): string => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(2) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(2) + 'K';
    } else {
      return value.toFixed(7);
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getProgressPercentage = (): number => {
    if (!co2Data) return 0;
    return Math.min((co2Data.currentBalance / co2Data.targetAmount) * 100, 100);
  };

  const getProgressColor = (): string => {
    const percentage = getProgressPercentage();
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-red-500';
  };

  const canPurchaseOffset = (): boolean => {
    return co2Data ? co2Data.currentBalance >= co2Data.targetAmount : false;
  };

  const openStellarExpert = () => {
    if (co2Data?.feeReceiver) {
      window.open(
        `https://stellar.expert/explorer/testnet/account/${co2Data.feeReceiver}`,
        '_blank'
      );
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <Leaf className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={loadCO2Data}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!co2Data) {
    return (
      <div className={className}>
        <Alert>
          <Leaf className="h-4 w-4" />
          <AlertDescription>
            No CO2 offset data available
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main CO2 Offset Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-green-500" />
            Carbon Offset Fund
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress towards target */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress to Next Offset Purchase</span>
              <span className="text-sm text-muted-foreground">
                {formatNumber(co2Data.currentBalance)} / {formatNumber(co2Data.targetAmount)} XLM
              </span>
            </div>
            <Progress 
              value={getProgressPercentage()} 
              className="h-2"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {co2Data.carbonOffsetPotential.toFixed(2)} tons CO₂ potential
              </span>
              <span className="text-muted-foreground">
                Target: {TARGET_CO2_TONS} tons CO₂
              </span>
            </div>
          </div>

          {/* Current Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(co2Data.currentBalance)}
              </div>
              <div className="text-sm text-muted-foreground">XLM Available</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {co2Data.carbonOffsetPotential.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Tons CO₂</div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {canPurchaseOffset() ? (
                <Badge variant="default" className="bg-green-500">
                  <Target className="h-3 w-3 mr-1" />
                  Ready to Offset
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Coins className="h-3 w-3 mr-1" />
                  Collecting Funds
                </Badge>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={openStellarExpert}
              disabled={!co2Data.feeReceiver}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View on Explorer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Fee Collection Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Fee Collection Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Fees Collected</p>
              <p className="text-lg font-semibold">{formatNumber(co2Data.totalFeesCollected)} XLM</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Available for CO2</p>
              <p className="text-lg font-semibold text-green-600">
                {formatNumber(co2Data.feesAvailableForCO2)} XLM
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Fee Receiver Address</p>
            <p className="text-sm font-mono bg-muted p-2 rounded break-all">
              {co2Data.feeReceiver}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Last Collection</p>
            <p className="text-sm">
              {co2Data.lastCollection ? 
                co2Data.lastCollection.toLocaleDateString() : 
                'No collections yet'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Environmental Impact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Environmental Impact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Leaf className="h-4 w-4" />
            <AlertDescription>
              <strong>Carbon Neutrality Goal:</strong> The vault automatically collects fees that are 
              allocated to purchase carbon offsets. This ensures that the environmental impact of 
              DeFi operations is neutralized through verified carbon offset programs.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {co2Data.carbonOffsetPotential.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Tons CO₂ Offset Potential</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {(co2Data.carbonOffsetPotential * 0.5).toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Equivalent Trees Planted</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {(co2Data.carbonOffsetPotential * 2.5).toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Miles Driven Offset</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>
                <strong>How it works:</strong> Every transaction in the vault generates a small fee. 
                These fees are automatically sent to the designated fee receiver address. Once enough 
                funds are collected, they can be used to purchase verified carbon offsets, making the 
                entire DeFi ecosystem more environmentally sustainable.
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Carbon Offset Strategy</h4>
              <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <li>• Automated fee collection from all vault transactions</li>
                <li>• Quarterly carbon offset purchases from verified providers</li>
                <li>• Transparent tracking of environmental impact</li>
                <li>• Integration with verified carbon credit registries</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button onClick={loadCO2Data} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh CO2 Data
        </Button>
      </div>
    </div>
  );
};
