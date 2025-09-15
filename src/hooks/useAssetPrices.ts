import { useState, useEffect, useCallback } from 'react';
import { useNetwork } from '@/contexts/NetworkContext';
import { useFiatCurrency } from '@/contexts/FiatCurrencyContext';
import { getAssetPrices, getPriceEngine } from '@/lib/reflector';

interface AssetPrice {
  code: string;
  price: number;
  error?: string;
}

interface UseAssetPricesResult {
  prices: Record<string, number>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getPrice: (assetCode: string) => number;
  getTotalValue: (balances: Record<string, number>) => number;
}

interface UseAssetPricesOptions {
  refreshInterval?: number;
  enabled?: boolean;
}

export const useAssetPrices = (
  assets: string[],
  options: UseAssetPricesOptions = {}
): UseAssetPricesResult => {
  const { refreshInterval = 5 * 60 * 1000, enabled = true } = options; // 5 minutes default
  const { network } = useNetwork();
  const { quoteCurrency } = useFiatCurrency();
  
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    if (!enabled || assets.length === 0) return;
    
    setLoading(true);
    setError(null);

    try {
      const priceData = await getAssetPrices(
        assets, 
        quoteCurrency, 
        network === 'mainnet' ? 'mainnet' : 'testnet'
      );
      
      setPrices(priceData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch asset prices';
      setError(errorMessage);
      console.error('Asset prices fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [assets, quoteCurrency, network, enabled]);

  const refresh = useCallback(async () => {
    // Clear cache and refetch
    const engine = getPriceEngine(network === 'mainnet' ? 'mainnet' : 'testnet');
    engine.clearCache();
    await fetchPrices();
  }, [fetchPrices, network]);

  const getPrice = useCallback((assetCode: string): number => {
    return prices[assetCode] || 0;
  }, [prices]);

  const getTotalValue = useCallback((balances: Record<string, number>): number => {
    return Object.entries(balances).reduce((total, [assetCode, balance]) => {
      const price = getPrice(assetCode);
      return total + (balance * price);
    }, 0);
  }, [getPrice]);

  // Initial fetch
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Set up refresh interval
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;

    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPrices, refreshInterval, enabled]);

  return {
    prices,
    loading,
    error,
    refresh,
    getPrice,
    getTotalValue
  };
};

// Hook for single asset price
export const useAssetPrice = (
  assetCode: string,
  options: UseAssetPricesOptions = {}
) => {
  const result = useAssetPrices([assetCode], options);
  
  return {
    price: result.getPrice(assetCode),
    loading: result.loading,
    error: result.error,
    refresh: result.refresh
  };
};

// Hook for portfolio total value
export const usePortfolioValue = (
  balances: Record<string, number>,
  options: UseAssetPricesOptions = {}
) => {
  const assets = Object.keys(balances).filter(asset => balances[asset] > 0);
  const result = useAssetPrices(assets, options);
  
  return {
    totalValue: result.getTotalValue(balances),
    prices: result.prices,
    loading: result.loading,
    error: result.error,
    refresh: result.refresh
  };
};