import { useState, useEffect, useCallback } from 'react';
import { useFiatCurrency } from '@/contexts/FiatCurrencyContext';
import { getAssetPrice } from '@/lib/reflector';
import { useNetwork } from '@/contexts/NetworkContext';
import Decimal from 'decimal.js';

interface ConversionResult {
  fiatAmount: number;
  rate: number;
  currency: string;
  timestamp: number;
}

interface UseFiatConversionReturn {
  convertXLMToFiat: (xlmAmount: string | number) => Promise<ConversionResult | null>;
  formatFiatAmount: (amount: number, currency?: string) => string;
  isLoading: boolean;
  error: string | null;
  lastRate: number | null;
}

export const useFiatConversion = (): UseFiatConversionReturn => {
  const { quoteCurrency, getCurrentCurrency } = useFiatCurrency();
  const { network } = useNetwork();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRate, setLastRate] = useState<number | null>(null);

  const convertXLMToFiat = useCallback(async (xlmAmount: string | number): Promise<ConversionResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const decimal = new Decimal(xlmAmount);
      if (!decimal.isPositive()) {
        throw new Error('Amount must be positive');
      }

      const rate = await getAssetPrice('XLM', quoteCurrency, network === 'mainnet' ? 'mainnet' : 'testnet');
      
      const fiatAmount = decimal.mul(rate).toNumber();
      
      setLastRate(rate);

      return {
        fiatAmount,
        rate,
        currency: quoteCurrency,
        timestamp: Date.now()
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to convert XLM to fiat';
      setError(errorMessage);
      console.error('Fiat conversion error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [quoteCurrency, network]);

  const formatFiatAmount = useCallback((amount: number, currency?: string): string => {
    const targetCurrency = currency || quoteCurrency;
    const currencyInfo = getCurrentCurrency();
    
    try {
      // Use Intl.NumberFormat for proper currency formatting
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: targetCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      });
      
      return formatter.format(amount);
    } catch {
      // Fallback formatting if Intl.NumberFormat fails
      const symbol = currencyInfo.symbol || '$';
      return `${symbol}${amount.toFixed(2)}`;
    }
  }, [quoteCurrency, getCurrentCurrency]);

  // Clear error when currency or network changes
  useEffect(() => {
    setError(null);
  }, [quoteCurrency, network]);

  return {
    convertXLMToFiat,
    formatFiatAmount,
    isLoading,
    error,
    lastRate
  };
};

// Hook for converting any amount to fiat with caching
export const useAmountToFiat = (amount: string | number, assetCode: string = 'XLM') => {
  const { quoteCurrency } = useFiatCurrency();
  const { network } = useNetwork();
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!amount || Number(amount) <= 0) {
      setResult(null);
      return;
    }

    const convertAmount = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const decimal = new Decimal(amount);
        const rate = await getAssetPrice(assetCode, quoteCurrency, network === 'mainnet' ? 'mainnet' : 'testnet');
        
        const fiatAmount = decimal.mul(rate).toNumber();

        setResult({
          fiatAmount,
          rate,
          currency: quoteCurrency,
          timestamp: Date.now()
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to convert to fiat';
        setError(errorMessage);
        console.error('Amount to fiat conversion error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    convertAmount();
  }, [amount, assetCode, quoteCurrency, network]);

  return { result, isLoading, error };
};