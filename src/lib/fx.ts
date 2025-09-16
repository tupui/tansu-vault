// EXACT copy from Stellar-Stratum fiat-currencies.ts
import { getAssetPrice } from './reflector';
import { REFLECTOR_ORACLE_CONTRACTS } from './appConfig';

// Cache for FX rates
const fxRatesCache: Record<string, { rate: number; timestamp: number }> = {};
const FX_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// FX Oracle configuration (using actual working contract)
const FX_ORACLE = {
  contract: REFLECTOR_ORACLE_CONTRACTS.mainnet.forex, // Use actual working forex oracle
  decimals: 14
};

// Get exchange rate quoted in USD per 1 unit of target currency (e.g., EURUSD)
export const getFxRate = async (targetCurrency: string): Promise<number> => {
  if (targetCurrency === 'USD') return 1;
  
  const cacheKey = `USD_${targetCurrency}`;
  const cached = fxRatesCache[cacheKey];
  
  if (cached && (Date.now() - cached.timestamp) < FX_CACHE_DURATION) {
    return cached.rate;
  }
  
  try {
    // Skip oracle for now since contract ID is invalid
    // Go directly to public API fallback
    throw new Error('Oracle disabled, using public API');
  } catch (error) {
    console.warn(`Skipping oracle, using public API for ${targetCurrency}:`, error);
    
    // Fallback to public API
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (res.ok) {
        const data = await res.json();
        const rate = data?.rates?.[targetCurrency];
        if (typeof rate === 'number' && rate > 0) {
          fxRatesCache[cacheKey] = { rate, timestamp: Date.now() };
          return rate;
        }
      }
    } catch (fallbackError) {
      console.warn(`Public FX fallback failed USD->${targetCurrency}:`, fallbackError);
    }
    
    throw error; // Don't fallback to hardcoded rates
  }
};

// Convert an amount in USD to the target currency using USD-per-target quote
// If rate is USD per 1 target unit (e.g., EURUSD), then target = USD / rate
export const convertFromUSD = async (usdAmount: number, targetCurrency: string): Promise<number> => {
  if (targetCurrency === 'USD') return usdAmount;
  
  const rate = await getFxRate(targetCurrency);
  return usdAmount / rate; // Convert using the USD-per-target rate
};

// Legacy functions for backward compatibility
export async function getUsdFxRate(toCurrency: string, network?: 'mainnet' | 'testnet'): Promise<number> {
  return await getFxRate(toCurrency);
}

export async function convertUsd(usdAmount: number, toCurrency: string, network?: 'mainnet' | 'testnet'): Promise<number> {
  return await convertFromUSD(usdAmount, toCurrency);
}

export async function getXlmRateWithFallback(toCurrency: string = 'USD', network?: 'mainnet' | 'testnet'): Promise<number | null> {
  try {
    const xlmUsdPrice = await getAssetPrice('XLM');
    if (toCurrency === 'USD') return xlmUsdPrice;
    
    const fxRate = await getFxRate(toCurrency);
    return xlmUsdPrice * fxRate;
  } catch {
    return null;
  }
}