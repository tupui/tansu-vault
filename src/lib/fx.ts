import { getPriceEngine } from './reflector';
import { getCurrentXlmUsdRate } from './kraken';

/**
 * Get USD to fiat exchange rate using proper Reflector engine (always mainnet for accurate rates)
 */
export async function getUsdFxRate(toCurrency: string, network?: 'mainnet' | 'testnet'): Promise<number> {
  if (toCurrency === 'USD') return 1;
  
  try {
    const engine = getPriceEngine('mainnet'); // Always use mainnet for pricing
    const rate = await engine.getPrice('USD', toCurrency);
    return rate && rate > 0 ? rate : 1;
  } catch (error) {
    console.warn(`Failed to get FX rate for USD to ${toCurrency}:`, error);
    return 1; // Fallback to 1:1 rate
  }
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
    const engine = getPriceEngine('mainnet');
    const rate = await Promise.race([
      engine.getPrice('XLM', toCurrency),
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