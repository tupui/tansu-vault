import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useAssetPrices, usePortfolioValue } from '@/hooks/useAssetPrices';
import { useFiatCurrency } from '@/contexts/FiatCurrencyContext';
import { formatFiatAmount } from '@/lib/fiat-currencies';

interface AssetBalance {
  code: string;
  balance: number;
  issuer?: string;
}

interface AssetBalancePanelProps {
  balances: AssetBalance[];
  title?: string;
  showRefresh?: boolean;
  hideSmallBalances?: boolean;
  smallBalanceThreshold?: number;
}

export const AssetBalancePanel: React.FC<AssetBalancePanelProps> = ({
  balances,
  title = 'Asset Balances',
  showRefresh = true,
  hideSmallBalances: initialHideSmall = false,
  smallBalanceThreshold = 1.0
}) => {
  const [hideSmallBalances, setHideSmallBalances] = useState(initialHideSmall);
  const { getCurrentCurrency } = useFiatCurrency();
  const currency = getCurrentCurrency();

  // Prepare asset codes for price fetching
  const assetCodes = balances.map(b => b.issuer ? `${b.issuer}:${b.code}` : b.code);
  const balanceMap = balances.reduce((acc, b) => {
    const key = b.issuer ? `${b.issuer}:${b.code}` : b.code;
    acc[key] = b.balance;
    return acc;
  }, {} as Record<string, number>);

  const { prices, loading, error, refresh } = useAssetPrices(assetCodes);
  const { totalValue } = usePortfolioValue(balanceMap);

  // Filter balances based on hide small balances setting
  const filteredBalances = balances.filter(balance => {
    if (!hideSmallBalances) return true;
    
    const assetKey = balance.issuer ? `${balance.issuer}:${balance.code}` : balance.code;
    const price = prices[assetKey] || 0;
    const fiatValue = balance.balance * price;
    
    return fiatValue >= smallBalanceThreshold;
  });

  const formatBalance = (balance: number): string => {
    if (balance < 0.0001) return balance.toExponential(2);
    if (balance < 1) return balance.toFixed(6);
    if (balance < 100) return balance.toFixed(4);
    return balance.toFixed(2);
  };

  const formatPrice = (price: number): string => {
    if (price < 0.01) return price.toExponential(3);
    return formatFiatAmount(price, currency);
  };

  const getAssetDisplayName = (balance: AssetBalance): string => {
    if (balance.issuer) {
      return `${balance.code} (${balance.issuer.slice(0, 4)}...${balance.issuer.slice(-4)})`;
    }
    return balance.code;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <div className="flex items-center space-x-2">
          {showRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Portfolio Total */}
        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">Total Portfolio Value</span>
          <span className="text-lg font-semibold">
            {loading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              formatFiatAmount(totalValue, currency)
            )}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="hide-small"
              checked={hideSmallBalances}
              onCheckedChange={setHideSmallBalances}
            />
            <Label htmlFor="hide-small" className="text-sm">
              Hide small balances (&lt; {formatFiatAmount(smallBalanceThreshold, currency)})
            </Label>
          </div>
          
          <Badge variant="secondary" className="text-xs">
            {filteredBalances.length} of {balances.length} assets
          </Badge>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">
              Failed to load asset prices: {error}
            </p>
          </div>
        )}

        {/* Asset List */}
        <div className="space-y-2">
          {loading && balances.length === 0 ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))
          ) : filteredBalances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hideSmallBalances ? 'No assets above threshold' : 'No assets found'}
            </div>
          ) : (
            filteredBalances.map((balance, index) => {
              const assetKey = balance.issuer ? `${balance.issuer}:${balance.code}` : balance.code;
              const price = prices[assetKey] || 0;
              const fiatValue = balance.balance * price;

              return (
                <div 
                  key={`${balance.code}-${balance.issuer || 'native'}-${index}`}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="font-medium">
                      {getAssetDisplayName(balance)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatBalance(balance.balance)} {balance.code}
                    </div>
                  </div>
                  
                  <div className="text-right space-y-1">
                    <div className="font-medium">
                      {loading ? (
                        <Skeleton className="h-4 w-16" />
                      ) : price > 0 ? (
                        formatFiatAmount(fiatValue, currency)
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {loading ? (
                        <Skeleton className="h-3 w-12" />
                      ) : price > 0 ? (
                        `@ ${formatPrice(price)}`
                      ) : (
                        '@ N/A'
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};