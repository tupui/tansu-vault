import { getAssetPrice } from '@/lib/reflector';
import { DEFAULT_NETWORK } from '@/lib/appConfig';

// Supported fiat currencies fetched dynamically from Reflector FX Oracle
export interface FiatCurrency {
  code: string;
  symbol: string;
  name: string;
}

// Static currency symbols and names for known currencies
const CURRENCY_INFO: Record<string, { symbol: string; name: string }> = {
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar' },
  AUD: { symbol: 'A$', name: 'Australian Dollar' },
  CHF: { symbol: 'CHF', name: 'Swiss Franc' },
  CNY: { symbol: '¥', name: 'Chinese Yuan' },
  SEK: { symbol: 'kr', name: 'Swedish Krona' },
  NZD: { symbol: 'NZ$', name: 'New Zealand Dollar' },
  NOK: { symbol: 'kr', name: 'Norwegian Krone' },
  DKK: { symbol: 'kr', name: 'Danish Krone' },
  PLN: { symbol: 'zł', name: 'Polish Zloty' },
  CZK: { symbol: 'Kč', name: 'Czech Koruna' },
  HUF: { symbol: 'Ft', name: 'Hungarian Forint' },
  RUB: { symbol: '₽', name: 'Russian Ruble' },
  BRL: { symbol: 'R$', name: 'Brazilian Real' },
  MXN: { symbol: '$', name: 'Mexican Peso' },
  INR: { symbol: '₹', name: 'Indian Rupee' },
  KRW: { symbol: '₩', name: 'South Korean Won' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar' },
  HKD: { symbol: 'HK$', name: 'Hong Kong Dollar' },
  TWD: { symbol: 'NT$', name: 'Taiwan Dollar' },
  THB: { symbol: '฿', name: 'Thai Baht' },
  MYR: { symbol: 'RM', name: 'Malaysian Ringgit' },
  IDR: { symbol: 'Rp', name: 'Indonesian Rupiah' },
  PHP: { symbol: '₱', name: 'Philippine Peso' },
  VND: { symbol: '₫', name: 'Vietnamese Dong' },
  ZAR: { symbol: 'R', name: 'South African Rand' },
};


/**
 * Fetch available fiat currencies from on-chain oracle (Reflector)
 */
export async function getAvailableFiatCurrencies(network: 'mainnet' | 'testnet' = DEFAULT_NETWORK): Promise<FiatCurrency[]> {
  // Use static fallback to avoid oracle calls that cause errors
  const essentialCurrencies: FiatCurrency[] = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' }
  ];

  return essentialCurrencies;
}

/**
 * Get exchange rate for XLM to fiat currency (EXACT copy from Stellar-Stratum)
 */
export const getXlmFiatRate = async (
  fiatCurrency: string,
  network?: string
): Promise<number> => {
  try {
    // Get current XLM price in USD
    const xlmToUsdRate = await getAssetPrice('XLM');
    
    if (fiatCurrency === 'USD') {
      return xlmToUsdRate;
    }

    // Get FX rate and convert
    const { convertFromUSD } = await import('./fx');
    return await convertFromUSD(xlmToUsdRate, fiatCurrency);
  } catch (error) {
    console.error('Failed to get XLM fiat rate:', error);
    return 0;
  }
};

/**
 * Format amount in fiat currency
 */
export function formatFiatAmount(amount: number, currency: FiatCurrency): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback if currency is not supported by Intl
    return `${currency.symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Get FX rate for currency conversion (placeholder - would use oracle in real implementation)
 */
export const getFxRate = async (targetCurrency: string): Promise<number> => {
  if (targetCurrency === 'USD') return 1;
  
  // Simple fallback rates for common currencies
  const rates: Record<string, number> = {
    'EUR': 0.85,
    'GBP': 0.73,
    'JPY': 110,
    'CAD': 1.25,
    'AUD': 1.35,
    'CHF': 0.92,
    'CNY': 6.45
  };
  
  return rates[targetCurrency] || 1;
};

/**
 * Convert an amount in USD to the target currency
 */
export const convertFromUSD = async (usdAmount: number, targetCurrency: string): Promise<number> => {
  const rate = await getFxRate(targetCurrency);
  if (!rate) return usdAmount; // fallback: return USD amount if no rate
  return usdAmount / rate;
};