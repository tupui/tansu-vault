/**
 * Account history hook with multi-level caching and progressive loading
 * Provides transaction history with fiat conversion and filtering
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNetwork } from '@/contexts/NetworkContext';
import { useFiatCurrency } from '@/contexts/FiatCurrencyContext';
import { loadAccountTransactions, type NormalizedTransaction } from '@/lib/horizon-utils';
import { getHorizonServer } from '@/lib/stellar';
import { getXlmUsdRateForDate, primeXlmUsdRates } from '@/lib/kraken';
import { getAssetPrice } from '@/lib/reflector';

// Cache configuration
const HISTORICAL_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const RECENT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const TRANSACTION_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const MEMORY_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const CACHE_VERSION = '1.2';

interface CachedPage {
  transactions: NormalizedTransaction[];
  cursor: string;
  timestamp: number;
}

interface CachedAccountData {
  pages: CachedPage[];
  lastSync: Date;
  totalTransactions: number;
  version: string;
}

interface TransactionFilters {
  direction: 'all' | 'in' | 'out';
  category: 'all' | 'transfer' | 'swap' | 'contract' | 'config' | 'other';
  minAmount: string;
  maxAmount: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  addressFilter: string;
  assetCode: string;
}

interface UseAccountHistoryReturn {
  transactions: NormalizedTransaction[];
  filteredTransactions: NormalizedTransaction[];
  fiatAmounts: Map<string, number>;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  filters: TransactionFilters;
  setFilters: (filters: Partial<TransactionFilters>) => void;
  fiatLoading: boolean;
  stats: {
    total: number;
    totalIn: number;
    totalOut: number;
    totalFiatIn: number;
    totalFiatOut: number;
  };
}

// Memory cache for recent data
const memoryCache = new Map<string, { data: CachedAccountData; timestamp: number }>();

export const useAccountHistory = (accountAddress: string | null): UseAccountHistoryReturn => {
  const { network } = useNetwork();
  const { quoteCurrency } = useFiatCurrency();
  
  const [transactions, setTransactions] = useState<NormalizedTransaction[]>([]);
  const [fiatAmounts, setFiatAmounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [fiatLoading, setFiatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  
  const [filters, setFiltersState] = useState<TransactionFilters>({
    direction: 'all',
    category: 'all',
    minAmount: '',
    maxAmount: '',
    dateFrom: undefined,
    dateTo: undefined,
    addressFilter: '',
    assetCode: ''
  });

  const cacheKey = `account-history-${accountAddress}-${network}`;
  const memoryCacheKey = `${accountAddress}-${network}`;

  // Helper functions for cache management
  const loadFromCache = useCallback((): CachedAccountData | null => {
    try {
      // Check memory cache first
      const memCached = memoryCache.get(memoryCacheKey);
      if (memCached && Date.now() - memCached.timestamp < MEMORY_CACHE_TTL) {
        return memCached.data;
      }

      // Check localStorage cache
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const data: CachedAccountData = JSON.parse(cached);
      
      // Check version compatibility
      if (data.version !== CACHE_VERSION) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      // Check if cache is still valid
      const cacheAge = Date.now() - new Date(data.lastSync).getTime();
      if (cacheAge > HISTORICAL_CACHE_DURATION) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      // Parse dates back from strings
      data.pages = data.pages.map(page => ({
        ...page,
        transactions: page.transactions.map(tx => ({
          ...tx,
          createdAt: new Date(tx.createdAt),
        }))
      }));
      
      // Update memory cache
      memoryCache.set(memoryCacheKey, { data, timestamp: Date.now() });
      
      return data;
    } catch (error) {
      console.warn('Failed to load transaction cache:', error);
      return null;
    }
  }, [cacheKey, memoryCacheKey]);

  const saveToCache = useCallback((data: CachedAccountData): void => {
    try {
      // Update memory cache
      memoryCache.set(memoryCacheKey, { data, timestamp: Date.now() });
      
      // Save to localStorage
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save transaction cache:', error);
    }
  }, [cacheKey, memoryCacheKey]);

  // Filter transactions based on current filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Direction filter
      if (filters.direction !== 'all' && tx.direction !== filters.direction) {
        return false;
      }
      
      // Category filter
      if (filters.category !== 'all' && tx.category !== filters.category) {
        return false;
      }
      
      // Amount filters
      if (filters.minAmount && tx.amount && tx.amount < parseFloat(filters.minAmount)) {
        return false;
      }
      if (filters.maxAmount && tx.amount && tx.amount > parseFloat(filters.maxAmount)) {
        return false;
      }
      
      // Date filters
      if (filters.dateFrom && tx.createdAt < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && tx.createdAt > filters.dateTo) {
        return false;
      }
      
      // Address filter
      if (filters.addressFilter && !tx.counterparty?.includes(filters.addressFilter)) {
        return false;
      }
      
      // Asset filter
      if (filters.assetCode && tx.assetCode !== filters.assetCode && filters.assetCode !== 'XLM') {
        return false;
      }
      if (filters.assetCode === 'XLM' && tx.assetType !== 'native') {
        return false;
      }
      
      return true;
    });
  }, [transactions, filters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const result = {
      total: filteredTransactions.length,
      totalIn: 0,
      totalOut: 0,
      totalFiatIn: 0,
      totalFiatOut: 0
    };

    for (const tx of filteredTransactions) {
      if (tx.direction === 'in' && tx.amount) {
        result.totalIn += tx.amount;
        const fiatAmount = fiatAmounts.get(tx.id);
        if (fiatAmount) result.totalFiatIn += fiatAmount;
      } else if (tx.direction === 'out' && tx.amount) {
        result.totalOut += tx.amount;
        const fiatAmount = fiatAmounts.get(tx.id);
        if (fiatAmount) result.totalFiatOut += fiatAmount;
      }
    }

    return result;
  }, [filteredTransactions, fiatAmounts]);

  // Convert USD to target fiat currency using direct FX rate
  const convertFromUSD = useCallback(async (usdAmount: number, targetCurrency: string): Promise<number> => {
    if (targetCurrency === 'USD') return usdAmount;
    
    try {
      const { convertUsd } = await import('@/lib/fx');
      return await convertUsd(usdAmount, targetCurrency, network === 'mainnet' ? 'mainnet' : 'testnet');
    } catch (error) {
      console.warn(`Failed to convert USD to ${targetCurrency}:`, error);
      return usdAmount; // Fallback to USD amount
    }
  }, [network]);

  // Convert transaction amounts to fiat
  useEffect(() => {
    if (!transactions.length || !quoteCurrency) return;

    const convertAll = async () => {
      setFiatLoading(true);
      const newFiatAmounts = new Map<string, number>();
      
      try {
        // Prime XLM/USD rates for the transaction date range
        const earliest = transactions.reduce((min, tx) => 
          tx.createdAt < min ? tx.createdAt : min, transactions[0].createdAt);
        const start = new Date(earliest);
        const end = new Date();
        await primeXlmUsdRates(start, end);
      } catch {
        // Ignore rate fetching errors, continue with current prices
      }

      // Pre-compute FX factor (USD -> target fiat) - fresh calculation each time
      let fxFactor = 1;
      if (quoteCurrency !== 'USD') {
        try {
          fxFactor = await convertFromUSD(1, quoteCurrency);
          console.log(`FX Factor for USD to ${quoteCurrency}:`, fxFactor);
        } catch (error) {
          console.warn(`Failed to get FX factor for ${quoteCurrency}, falling back to USD:`, error);
          fxFactor = 1;
        }
      }

      // Cache for non-XLM asset prices to avoid redundant calls
      const otherPriceCache = new Map<string, number>();
      
      for (const tx of transactions) {
        if (!tx.amount) {
          newFiatAmounts.set(tx.id, 0);
          continue;
        }

        const txDate = tx.createdAt instanceof Date ? tx.createdAt : new Date(tx.createdAt);
        let usdPrice = 0;
        
        if (tx.assetType === 'native') {
          // Use historical XLM price for the transaction date
          usdPrice = await getXlmUsdRateForDate(txDate);
        } else {
          // Use current price for other assets (get USD price then convert)
          const key = `${tx.assetCode}:${tx.assetIssuer}`;
          if (!otherPriceCache.has(key)) {
            try {
              // Always get USD price first for consistency
              const p = await getAssetPrice(tx.assetCode!, 'USD', network === 'mainnet' ? 'mainnet' : 'testnet');
              otherPriceCache.set(key, p || 0);
            } catch {
              otherPriceCache.set(key, 0);
            }
          }
          usdPrice = otherPriceCache.get(key) || 0;
        }

        if (!usdPrice) {
          newFiatAmounts.set(tx.id, 0);
          continue;
        }
        
        const usdAmount = usdPrice * tx.amount;
        const fiatAmount = usdAmount * fxFactor; // Apply FX conversion for all assets
        newFiatAmounts.set(tx.id, fiatAmount);
      }
      
      setFiatAmounts(newFiatAmounts);
      setFiatLoading(false);
    };

    convertAll();
  }, [transactions, quoteCurrency, network, convertFromUSD]);

  // Load transactions from API
  const loadTransactions = useCallback(async (cursor?: string, append: boolean = false): Promise<void> => {
    if (!accountAddress) return;

    setLoading(true);
    setError(null);

    try {
      const server = getHorizonServer();
      const result = await loadAccountTransactions(server, accountAddress, 200, cursor);
      
      if (append) {
        setTransactions(prev => [...prev, ...result.transactions]);
      } else {
        setTransactions(result.transactions);
      }
      
      setNextCursor(result.nextCursor);
      setHasMore(!!result.nextCursor && result.transactions.length > 0);

      // Update cache
      const cached = loadFromCache() || {
        pages: [],
        lastSync: new Date(),
        totalTransactions: 0,
        version: CACHE_VERSION
      };

      if (!append) {
        // Replace cache on refresh
        cached.pages = [{
          transactions: result.transactions,
          cursor: result.nextCursor || '',
          timestamp: Date.now()
        }];
      } else {
        // Append to cache
        cached.pages.push({
          transactions: result.transactions,
          cursor: result.nextCursor || '',
          timestamp: Date.now()
        });
      }
      
      cached.lastSync = new Date();
      cached.totalTransactions = cached.pages.reduce((sum, page) => sum + page.transactions.length, 0);
      saveToCache(cached);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions';
      setError(errorMessage);
      console.error('Transaction loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [accountAddress, loadFromCache, saveToCache]);

  // Load more transactions
  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMore || loading || !nextCursor) return;
    await loadTransactions(nextCursor, true);
  }, [hasMore, loading, nextCursor, loadTransactions]);

  // Refresh transactions
  const refresh = useCallback(async (): Promise<void> => {
    setNextCursor(undefined);
    await loadTransactions();
  }, [loadTransactions]);

  // Update filters
  const setFilters = useCallback((newFilters: Partial<TransactionFilters>): void => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Initial load - try cache first, then API
  useEffect(() => {
    if (!accountAddress) {
      setTransactions([]);
      setFiatAmounts(new Map());
      return;
    }

    const initializeData = async () => {
      const cached = loadFromCache();
      
      if (cached && cached.pages.length > 0) {
        // Load from cache
        const allTransactions = cached.pages.flatMap(page => page.transactions);
        setTransactions(allTransactions);
        
        const lastPage = cached.pages[cached.pages.length - 1];
        setNextCursor(lastPage.cursor);
        setHasMore(!!lastPage.cursor);
        
        // Check if we need to refresh recent data
        const cacheAge = Date.now() - new Date(cached.lastSync).getTime();
        if (cacheAge > RECENT_CACHE_DURATION) {
          // Refresh in background
          loadTransactions();
        }
      } else {
        // Load from API
        await loadTransactions();
      }
    };

    initializeData();
  }, [accountAddress, network, loadFromCache, loadTransactions]);

  return {
    transactions,
    filteredTransactions,
    fiatAmounts,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    filters,
    setFilters,
    fiatLoading,
    stats
  };
};