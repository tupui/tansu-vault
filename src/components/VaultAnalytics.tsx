import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Activity, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Leaf
} from 'lucide-react';
import { getVaultAnalytics, type VaultInfo, type VaultStats } from '@/lib/defindex-service';
import { useToast } from '@/hooks/use-toast';

interface VaultAnalyticsProps {
  className?: string;
}

export const VaultAnalytics: React.FC<VaultAnalyticsProps> = ({ className }) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getVaultAnalytics('testnet');
      setAnalytics(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load vault analytics';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const formatNumber = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    } else {
      return num.toFixed(7);
    }
  };

  const formatCurrency = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return 'default' as const;
      case 'medium':
        return 'secondary' as const;
      case 'high':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={loadAnalytics}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={className}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No analytics data available
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { overview, stats, health, performance, feeData } = analytics;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value Locked</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalValueLocked)} XLM</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(parseFloat(stats.totalValueLocked) * 0.1)} {/* Placeholder USD conversion */}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Share Price</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.sharePrice)} XLM</div>
            <p className="text-xs text-muted-foreground">
              {stats.apy > 0 ? `+${stats.apy.toFixed(2)}% APY` : 'No APY data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalShares)}</div>
            <p className="text-xs text-muted-foreground">
              {overview.symbol} tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vault Health</CardTitle>
            {getHealthIcon(health.status)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold capitalize ${getHealthColor(health.status)}`}>
              {health.status}
            </div>
            <p className="text-xs text-muted-foreground">
              Risk: <Badge variant={getRiskBadgeVariant(health.riskLevel)} className="text-xs">
                {health.riskLevel}
              </Badge>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vault Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Vault Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-sm">{overview.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Symbol</p>
                <p className="text-sm">{overview.symbol}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Manager</p>
                <p className="text-sm font-mono text-xs break-all">
                  {overview.manager ? `${overview.manager.slice(0, 8)}...${overview.manager.slice(-8)}` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Emergency Manager</p>
                <p className="text-sm font-mono text-xs break-all">
                  {overview.emergencyManager ? `${overview.emergencyManager.slice(0, 8)}...${overview.emergencyManager.slice(-8)}` : 'N/A'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Supported Assets</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {overview.assets.map((asset, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {asset}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Strategies</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {overview.strategies.length > 0 ? (
                  overview.strategies.map((strategy, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      Strategy {index + 1}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="text-xs">No strategies</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Value</p>
                <p className="text-lg font-semibold">{formatNumber(performance.currentValue)} XLM</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Return</p>
                <p className="text-lg font-semibold">{performance.totalReturn}%</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Annualized Return</p>
                <p className="text-lg font-semibold">{performance.annualizedReturn}%</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Volatility</p>
                <p className="text-lg font-semibold">{performance.volatility}%</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Utilization Rate</p>
                  <p className="text-lg font-semibold">{health.utilizationRate}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground">Last Rebalance</p>
                  <p className="text-sm">
                    {health.lastRebalance ? 
                      new Date(health.lastRebalance).toLocaleDateString() : 
                      'Never'
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fee Collection for CO2 Offsets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-green-500" />
              CO2 Offset Fund
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fee Receiver</p>
              <p className="text-sm font-mono text-xs break-all">
                {feeData.feeReceiver ? 
                  `${feeData.feeReceiver.slice(0, 8)}...${feeData.feeReceiver.slice(-8)}` : 
                  'Not configured'
                }
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Fees Collected</p>
                <p className="text-lg font-semibold">{formatNumber(feeData.totalFeesCollected)} XLM</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available for CO2</p>
                <p className="text-lg font-semibold text-green-600">{formatNumber(feeData.feesAvailableForCO2)} XLM</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Collection</p>
              <p className="text-sm">
                {feeData.lastFeeCollection ? 
                  new Date(feeData.lastFeeCollection).toLocaleDateString() : 
                  'No collections yet'
                }
              </p>
            </div>

            <Alert>
              <Leaf className="h-4 w-4" />
              <AlertDescription>
                Fees collected by the vault are automatically allocated to the CO2 offset fund. 
                These funds will be used to purchase carbon offsets to neutralize the environmental impact.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Transaction Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Transaction Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Deposits</p>
                <p className="text-lg font-semibold">{formatNumber(stats.totalDeposits)} XLM</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Withdrawals</p>
                <p className="text-lg font-semibold">{formatNumber(stats.totalWithdrawals)} XLM</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Flow</p>
                <p className={`text-lg font-semibold ${
                  parseFloat(stats.netFlow) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {parseFloat(stats.netFlow) >= 0 ? '+' : ''}{formatNumber(stats.netFlow)} XLM
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fees Collected</p>
                <p className="text-lg font-semibold">{formatNumber(stats.feeCollected)} XLM</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-lg font-semibold">{stats.totalUsers}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground">Average per User</p>
                  <p className="text-sm">
                    {stats.totalUsers > 0 ? 
                      formatNumber(parseFloat(stats.totalValueLocked) / stats.totalUsers) : 
                      '0'
                    } XLM
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button onClick={loadAnalytics} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Analytics
        </Button>
      </div>
    </div>
  );
};
