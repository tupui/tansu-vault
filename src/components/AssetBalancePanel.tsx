import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, DollarSign, TrendingUp, Filter, Eye, EyeOff, Clock, ExternalLink } from 'lucide-react';
import { useAssetPrices } from '@/hooks/useAssetPrices';
import { getLastFetchTimestamp, clearPriceCache } from '@/lib/reflector';
import { convertFromUSD } from '@/lib/fiat-currencies';
import { useFiatCurrency } from '@/contexts/FiatCurrencyContext';

interface AssetBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

interface AssetBalancePanelProps {
  balances: AssetBalance[];
  title?: string;
  showRefresh?: boolean;
  onRefreshBalances?: () => Promise<void>;
}

export const AssetBalancePanel = ({
  balances,
  title = 'Asset Balances',
  showRefresh = true,
  onRefreshBalances
}: AssetBalancePanelProps) => {
  const {
    assetsWithPrices,
    totalValueUSD,
    loading,
    error,
    refetch
  } = useAssetPrices(balances);
  const {
    quoteCurrency,
    getCurrentCurrency
  } = useFiatCurrency();
  const [hideSmallBalances, setHideSmallBalances] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(getLastFetchTimestamp());
  const [convertedTotalValue, setConvertedTotalValue] = useState(totalValueUSD);
  const [convertedAssetValues, setConvertedAssetValues] = useState<Record<number, number>>({});
  const [convertedAssetPrices, setConvertedAssetPrices] = useState<Record<number, number>>({});

  const handleRefresh = useCallback(async () => {
    try {
      // Clear price cache but keep asset lists
      clearPriceCache();
      if (onRefreshBalances) {
        await onRefreshBalances();
      }
      await refetch();
    } catch (e) {
      // Ignore refresh errors - balances will be updated on next successful fetch
    } finally {
      // Always update timestamp after any operation
      setLastUpdateTime(new Date());
    }
  }, [onRefreshBalances, refetch]);

  const formatLastUpdate = useCallback((date: Date | null): string => {
    if (!date) return '';
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return date.toLocaleDateString();
  }, []);

  // Filter assets based on hide small balances toggle (memoized for performance)
  const filteredAssets = useMemo(() => 
    hideSmallBalances ? assetsWithPrices.filter(asset => asset.valueUSD >= 1) : assetsWithPrices,
    [hideSmallBalances, assetsWithPrices]
  );

  // Update converted values when currency changes
  useEffect(() => {
    const convertAllValues = async () => {
      if (quoteCurrency === 'USD') {
        setConvertedTotalValue(totalValueUSD);
        setConvertedAssetValues({});
        setConvertedAssetPrices({});
        return;
      }

      // Convert total value
      if (totalValueUSD) {
        try {
          const convertedTotal = await convertFromUSD(totalValueUSD, quoteCurrency);
          setConvertedTotalValue(convertedTotal);
        } catch (error) {
          setConvertedTotalValue(totalValueUSD);
        }
      }

      // Convert individual asset values and prices
      const newConvertedValues: Record<number, number> = {};
      const newConvertedPrices: Record<number, number> = {};
      for (let i = 0; i < assetsWithPrices.length; i++) {
        const asset = assetsWithPrices[i];
        if (asset.valueUSD > 0) {
          try {
            const convertedValue = await convertFromUSD(asset.valueUSD, quoteCurrency);
            newConvertedValues[i] = convertedValue;
          } catch (error) {
            // Ignore conversion errors - use USD fallback
          }
        }
        if (asset.priceUSD > 0) {
          try {
            const convertedPrice = await convertFromUSD(asset.priceUSD, quoteCurrency);
            newConvertedPrices[i] = convertedPrice;
          } catch (error) {
            // Ignore conversion errors - use USD fallback
          }
        }
      }
      setConvertedAssetValues(newConvertedValues);
      setConvertedAssetPrices(newConvertedPrices);
    };
    convertAllValues();
  }, [totalValueUSD, quoteCurrency, assetsWithPrices]);

  const formatPriceSync = (price: number, assetIndex: number): string => {
    const currency = getCurrentCurrency();
    if (price === 0) return 'N/A';

    // Use converted price if available, otherwise use USD price
    const displayPrice = quoteCurrency !== 'USD' && convertedAssetPrices[assetIndex] ? convertedAssetPrices[assetIndex] : price;

    // If we couldn't convert and it's not USD, show USD as fallback
    const symbol = quoteCurrency !== 'USD' && !convertedAssetPrices[assetIndex] ? '$' : currency.symbol;
    if (displayPrice < 0.01) return `${symbol}${displayPrice.toFixed(6)}`;
    if (displayPrice < 1) return `${symbol}${displayPrice.toFixed(4)}`;
    return `${symbol}${displayPrice.toFixed(2)}`;
  };

  const formatValueForAsset = (value: number, assetIndex: number): string => {
    const currency = getCurrentCurrency();
    if (value === 0) return 'N/A';

    // Use converted value if available, otherwise use USD value
    const displayValue = quoteCurrency !== 'USD' && convertedAssetValues[assetIndex] ? convertedAssetValues[assetIndex] : value;

    // If we couldn't convert and it's not USD, show USD as fallback
    const symbol = quoteCurrency !== 'USD' && !convertedAssetValues[assetIndex] ? '$' : currency.symbol;
    if (displayValue < 0.01) return `<${symbol}0.01`;
    return `${symbol}${displayValue.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatValueSync = (value: number): string => {
    const currency = getCurrentCurrency();
    // Use the cached converted value for total, or fall back to simple conversion
    const convertedValue = value === totalValueUSD ? convertedTotalValue : value;
    if (convertedValue === 0) return 'N/A';
    if (convertedValue < 0.01) return `<${currency.symbol}0.01`;
    return `${currency.symbol}${convertedValue.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatBalance = (balance: string): string => {
    const num = parseFloat(balance);
    if (num === 0) return '0.00';
    if (num < 0.01) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    // Always show 2 decimal places for consistent alignment
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getAssetDisplayName = (asset: AssetBalance): string => {
    if (asset.asset_type === 'native') return 'XLM';
    if (asset.asset_issuer) {
      return `${asset.asset_code} (${asset.asset_issuer.slice(0, 4)}...${asset.asset_issuer.slice(-4)})`;
    }
    return asset.asset_code || 'Unknown';
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {showRefresh && (
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading} className="h-8 px-2">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
        
        {/* Price Update Info */}
        {lastUpdateTime && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
            <Clock className="w-3 h-3" />
            <span>Prices updated {formatLastUpdate(lastUpdateTime)}</span>
            <span className="text-muted-foreground/60">• </span>
            <a href="https://reflector.space" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1">
              via Reflector
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Total Value Display */}
        <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground/80">Total Portfolio Value</p>
              <p className="text-2xl font-bold">
                {loading ? (
                  <span className="bg-gradient-to-r from-primary/60 via-primary to-primary/60 bg-[length:200%_100%] animate-pulse bg-clip-text text-transparent">
                    Loading...
                  </span>
                ) : (
                  <span className="text-primary">{formatValueSync(totalValueUSD)}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-start gap-4 p-3 bg-secondary/20 rounded-lg border border-border/50">
          <div className="flex items-center space-x-3">
            <Switch id="hide-small" checked={hideSmallBalances} onCheckedChange={setHideSmallBalances} />
            <Label htmlFor="hide-small" className="text-sm font-medium">Hide &lt; $1</Label>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Assets List */}
        <div className="space-y-3">
          {loading && filteredAssets.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                <span className="text-primary font-medium">Loading prices...</span>
              </div>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Filter className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {hideSmallBalances ? 'No assets above $1' : 'No assets found'}
              </p>
            </div>
          ) : (
            filteredAssets.map((asset, index) => (
              <div key={index} className="p-4 border border-border/60 rounded-lg hover:bg-secondary/30 hover:border-border transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{asset.symbol}</p>
                        {asset.asset_type === 'native' && (
                          <Badge variant="outline" className="text-xs border-primary/30 text-primary">Native</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground/80">
                        {asset.asset_type === 'native' ? 'Stellar Lumens' : getAssetDisplayName(asset)}
                      </p>
                      {asset.priceUSD === -1 ? (
                        <Skeleton className="h-3 w-16 mt-1" />
                      ) : asset.priceUSD > 0 ? (
                        <p className="text-xs text-muted-foreground/70">
                          {formatPriceSync(asset.priceUSD, index)} per {asset.symbol}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/70">Price unavailable</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-foreground tabular-nums" style={{
                      fontVariantNumeric: 'tabular-nums',
                      textAlign: 'right',
                      minWidth: '120px'
                    }}>
                      {formatBalance(asset.balance)}
                    </p>
                    <p className="text-sm text-muted-foreground/70">{asset.symbol}</p>
                    <div className="text-sm font-medium text-primary flex justify-end">
                      {asset.priceUSD === -1 ? (
                        <Skeleton className="h-4 w-16" />
                      ) : (
                        formatValueForAsset(asset.valueUSD, index)
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        {filteredAssets.length > 0 && (
          <>
            <Separator />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                Showing {filteredAssets.length} of {assetsWithPrices.length} assets
                {hideSmallBalances && <span className="ml-1">(&gt;= $1)</span>}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};