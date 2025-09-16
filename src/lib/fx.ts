import { getAssetPrice } from './reflector';
import { getCurrentXlmUsdRate } from './kraken';

/**
 * Get USD to fiat exchange rate using proper Reflector engine (always mainnet for accurate rates)
 */
export async function getUsdFxRate(toCurrency: string, network?: 'mainnet' | 'testnet'): Promise<number> {
  const target = (toCurrency || 'USD').toUpperCase();
  if (target === 'USD') return 1;
  
  // Try Reflector engine first (always mainnet for pricing)
  try {
    const rate = await getAssetPrice('USD');
    if (rate && rate > 0) return rate;
  } catch (error) {
    console.warn(`Reflector FX rate failed USD->${target}:`, error);
  }

  // Public API fallback with simple in-memory cache (15 minutes)
  try {
    const cacheKey = `fx_USD_${target}`;
    const now = Date.now();
    // Persist across HMR by attaching to globalThis
    const g: any = globalThis as any;
    g.__fxCache = g.__fxCache || new Map<string, { r: number; t: number }>();
    const cached = g.__fxCache.get(cacheKey);
    if (cached && now - cached.t < 15 * 60_000) {
      return cached.r;
    }

    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (res.ok) {
      const data = await res.json();
      const r = data?.rates?.[target];
      if (typeof r === 'number' && r > 0) {
        g.__fxCache.set(cacheKey, { r, t: now });
        return r;
      }
    }
  } catch (fallbackError) {
    console.warn(`Public FX fallback failed USD->${target}:`, fallbackError);
  }
  
  // Final fallback
  return 1;
}

/**
 * Convert USD amount to target fiat currency (always uses mainnet rates)
 */
export async function convertUsd(usdAmount: number, toCurrency: string, network?: 'mainnet' | 'testnet'): Promise<number> {
  if (toCurrency === 'USD') return usdAmount;
  
  const rate = await getUsdFxRate(toCurrency);
  return usdAmount * rate;
}

/**
 * Get XLM rate with robust fallback (Reflector -> Kraken) - always uses mainnet rates
 */
export async function getXlmRateWithFallback(toCurrency: string = 'USD', network?: 'mainnet' | 'testnet'): Promise<number | null> {
  try {
    // Try Reflector engine first (always mainnet for accurate pricing)
    const rate = await Promise.race([
      getAssetPrice('XLM'),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
    ]);
    
    if (rate && rate > 0) {
      return rate;
    }
  } catch (error) {
    console.warn('Reflector XLM price failed, trying Kraken fallback:', error);
  }
  
  try {
    // Fallback to Kraken for XLM/USD then convert if needed
    const usdRate = await getCurrentXlmUsdRate();
    if (usdRate && usdRate > 0) {
      if (toCurrency === 'USD') {
        return usdRate;
      } else {
        // Convert USD to target currency using FX rate (mainnet)
        const fxRate = await getUsdFxRate(toCurrency);
        return usdRate * fxRate;
      }
    }
  } catch (error) {
    console.warn('Kraken XLM price also failed:', error);
  }
  
  return null;
}