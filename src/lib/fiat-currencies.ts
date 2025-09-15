import { getOracleClient } from '@/lib/reflector-client';

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

// Reflector FX Oracle endpoint
const REFLECTOR_FX_URL = 'https://api.reflector.network/v1/fx';

/**
 * Fetch available fiat currencies from Reflector FX Oracle
 */
export async function getAvailableFiatCurrencies(): Promise<FiatCurrency[]> {
  try {
    const response = await fetch(`${REFLECTOR_FX_URL}/currencies`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch currencies: ${response.status}`);
    }

    const data = await response.json();
    const currencies: string[] = data.currencies || [];

    // Map to FiatCurrency objects with symbols and names
    return currencies.map(code => ({
      code,
      symbol: CURRENCY_INFO[code]?.symbol || code,
      name: CURRENCY_INFO[code]?.name || code,
    })).sort((a, b) => a.code.localeCompare(b.code));

  } catch (error) {
    console.warn('Failed to fetch currencies from Reflector, using fallback list:', error);
    
    // Fallback to most common currencies
    const fallbackCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'];
    return fallbackCurrencies.map(code => ({
      code,
      symbol: CURRENCY_INFO[code]?.symbol || code,
      name: CURRENCY_INFO[code]?.name || code,
    }));
  }
}

/**
 * Get exchange rate for XLM to fiat currency
 */
export const getXlmFiatRate = async (fiatCurrency: string, network: string = 'testnet'): Promise<number> => {
  try {
    // Use Reflector Oracle for XLM prices
    const oracleClient = getOracleClient(network === 'mainnet' ? 'mainnet' : 'testnet');
    return await oracleClient.getAssetPrice('XLM', fiatCurrency);
  } catch (error) {
    console.warn(`Failed to get XLM/${fiatCurrency} rate:`, error);
    
    // Fallback rates for common currencies (approximate values)
    const fallbackRates: Record<string, number> = {
      'USD': 0.12,
      'EUR': 0.10,
      'GBP': 0.09,
      'JPY': 13.2,
      'CAD': 0.15,
      'AUD': 0.16,
      'CHF': 0.11,
      'CNY': 0.78,
      'KRW': 140,
      'INR': 9.5
    };
    
    return fallbackRates[fiatCurrency] || 0.12;
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