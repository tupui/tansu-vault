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


/**
 * Fetch available fiat currencies from on-chain oracle (Reflector)
 */
export async function getAvailableFiatCurrencies(network: 'mainnet' | 'testnet' = 'testnet'): Promise<FiatCurrency[]> {
  const oracleClient = getOracleClient(network);
  try {
    // Expect the oracle to expose supported currencies
    // Method name follows Stellar-Stratum pattern: 'supported_currencies'
    // We call it via a helper on the client; if not available, we return only USD
    // to keep the app usable without introducing hardcoded pricing.
    const anyClient = oracleClient as any;
    const list: string[] = typeof anyClient.listSupportedCurrencies === 'function'
      ? await anyClient.listSupportedCurrencies()
      : ['USD'];

    return list
      .map((code) => ({
        code,
        symbol: CURRENCY_INFO[code]?.symbol || code,
        name: CURRENCY_INFO[code]?.name || code,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
  } catch (error) {
    console.error('Failed to load currencies from oracle:', error);
    return [
      { code: 'USD', symbol: CURRENCY_INFO['USD'].symbol, name: CURRENCY_INFO['USD'].name }
    ];
  }
}

/**
 * Get exchange rate for XLM to fiat currency (no hardcoded fallbacks)
 */
export const getXlmFiatRate = async (
  fiatCurrency: string,
  network: string = 'testnet'
): Promise<number> => {
  const oracleClient = getOracleClient(network === 'mainnet' ? 'mainnet' : 'testnet');
  return await oracleClient.getAssetPrice('XLM', fiatCurrency);
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