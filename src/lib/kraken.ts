/**
 * Kraken API integration for historical XLM pricing
 * Provides historical XLM/USD rates for transaction history fiat conversion
 */

// Rate limiting for Kraken API (20 requests per minute)
const WINDOW_MS = 60_000; // 1 minute
const LIMIT = 20; // requests per minute
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours cache

interface RateLimiter {
  requests: number[];
  limit: number;
  windowMs: number;
}

const rateLimiter: RateLimiter = {
  requests: [],
  limit: LIMIT,
  windowMs: WINDOW_MS
};

const checkRateLimit = (): Promise<void> => {
  return new Promise((resolve) => {
    const now = Date.now();
    rateLimiter.requests = rateLimiter.requests.filter(time => now - time < rateLimiter.windowMs);
    
    if (rateLimiter.requests.length < rateLimiter.limit) {
      rateLimiter.requests.push(now);
      resolve();
    } else {
      const oldestRequest = Math.min(...rateLimiter.requests);
      const delay = rateLimiter.windowMs - (now - oldestRequest) + 100;
      setTimeout(() => {
        rateLimiter.requests.push(Date.now());
        resolve();
      }, delay);
    }
  });
};

const runLimited = async <T>(fn: () => Promise<T>): Promise<T> => {
  await checkRateLimit();
  return fn();
};

// Cache interface
interface PriceCache {
  [dateKey: string]: number;
}

const CACHE_KEY = 'kraken-xlm-usd-cache';
const CACHE_VERSION = '1.0';

interface CacheData {
  version: string;
  data: PriceCache;
  lastUpdated: number;
}

const loadCache = (): PriceCache => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return {};
    
    const cacheData: CacheData = JSON.parse(cached);
    if (cacheData.version !== CACHE_VERSION) {
      localStorage.removeItem(CACHE_KEY);
      return {};
    }
    
    // Check if cache is still valid
    if (Date.now() - cacheData.lastUpdated > TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return {};
    }
    
    return cacheData.data;
  } catch {
    return {};
  }
};

const saveCache = (cache: PriceCache): void => {
  try {
    const cacheData: CacheData = {
      version: CACHE_VERSION,
      data: cache,
      lastUpdated: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to save price cache:', error);
  }
};

const toDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Fetch daily OHLC data from Kraken
 */
const fetchDaily = async (start: Date): Promise<void> => {
  const since = Math.floor(start.getTime() / 1000);
  const baseUrl = 'https://api.kraken.com/0/public/OHLC';
  const pairs = ['XLMUSD', 'XXLMZUSD']; // Try both pairs

  for (const pair of pairs) {
    try {
      const url = `${baseUrl}?pair=${encodeURIComponent(pair)}&interval=1440&since=${since}`;
      const resp = await runLimited(() => fetch(url, { mode: 'cors' }));
      if (!resp.ok) continue;
      
      const json: any = await resp.json();
      if (!json?.result || typeof json.result !== 'object') continue;
      
      const keys = Object.keys(json.result).filter(k => k !== 'last');
      if (keys.length === 0) continue;
      
      const arr: any[] = json.result[keys[0]];
      if (!Array.isArray(arr)) continue;
      
      const cache = loadCache();
      for (const row of arr) {
        // row: [time, open, high, low, close, vwap, volume, count]
        const ts = row[0];
        const close = Number(row[4]);
        if (!Number.isFinite(close)) continue;
        
        const key = toDateKey(new Date(ts * 1000));
        cache[key] = close;
      }
      saveCache(cache);
      return;
    } catch {
      // Try next pair
    }
  }
};

/**
 * Prime XLM/USD rates for a date range
 */
export const primeXlmUsdRates = async (start: Date, end: Date): Promise<void> => {
  try {
    const cache = loadCache();
    const today = new Date();
    const earliest = start > new Date('2017-01-01') ? start : new Date('2017-01-01');
    
    // Check if we need to fetch data
    let needsFetch = false;
    const current = new Date(earliest);
    while (current <= end && current <= today) {
      const key = toDateKey(current);
      if (!cache[key]) {
        needsFetch = true;
        break;
      }
      current.setDate(current.getDate() + 1);
    }
    
    if (needsFetch) {
      await fetchDaily(earliest);
    }
  } catch (error) {
    console.warn('Failed to prime XLM/USD rates:', error);
  }
};

/**
 * Get XLM/USD rate for a specific date
 */
export const getXlmUsdRateForDate = async (date: Date): Promise<number> => {
  const key = toDateKey(date);
  const cache = loadCache();
  
  if (cache[key]) {
    return cache[key];
  }
  
  // Try to fetch missing data
  try {
    await primeXlmUsdRates(new Date(date.getTime() - 7 * 24 * 3600 * 1000), new Date());
    const updated = loadCache();
    if (updated[key]) {
      return updated[key];
    }
  } catch {
    // Ignore fetch errors
  }
  
  // Fallback: look for nearest date
  const dates = Object.keys(cache).sort();
  if (dates.length === 0) return 0;
  
  // Find closest date
  let closest = dates[0];
  let minDiff = Math.abs(new Date(dates[0]).getTime() - date.getTime());
  
  for (const dateStr of dates) {
    const diff = Math.abs(new Date(dateStr).getTime() - date.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = dateStr;
    }
  }
  
  return cache[closest] || 0;
};

/**
 * Get current XLM/USD rate (latest available)
 */
export const getCurrentXlmUsdRate = async (): Promise<number> => {
  try {
    // Try to get today's rate first
    const today = new Date();
    let rate = await getXlmUsdRateForDate(today);
    
    if (rate > 0) return rate;
    
    // If today's rate is not available, get the most recent rate
    const cache = loadCache();
    const dates = Object.keys(cache).sort().reverse();
    
    if (dates.length > 0) {
      return cache[dates[0]];
    }
    
    // If no cached data, fetch recent data
    await fetchDaily(new Date(Date.now() - 7 * 24 * 3600 * 1000));
    const updated = loadCache();
    const updatedDates = Object.keys(updated).sort().reverse();
    
    return updatedDates.length > 0 ? updated[updatedDates[0]] : 0;
  } catch (error) {
    console.warn('Failed to get current XLM/USD rate:', error);
    return 0;
  }
};

/**
 * Clear price cache (for testing or manual refresh)
 */
export const clearPriceCache = (): void => {
  localStorage.removeItem(CACHE_KEY);
};

/**
 * Get cache statistics
 */
export const getCacheStats = (): { entries: number; oldestDate: string | null; newestDate: string | null } => {
  const cache = loadCache();
  const dates = Object.keys(cache).sort();
  
  return {
    entries: dates.length,
    oldestDate: dates.length > 0 ? dates[0] : null,
    newestDate: dates.length > 0 ? dates[dates.length - 1] : null
  };
};