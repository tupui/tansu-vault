import { getAssetPrice } from '@/lib/reflector';

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
  try {
    // Get oracle client for the network
    const { getOracleClient } = await import('@/lib/reflector-client');
    const oracleClient = getOracleClient(network);
    
    // Try to get supported currencies directly from FX oracle
    let supportedCurrencies: string[] = [];
    try {
      supportedCurrencies = await oracleClient.listSupportedCurrencies();
    } catch (error) {
      console.warn('Failed to fetch supported currencies from oracle:', error);
    }

    // If we got currencies from oracle, convert them to FiatCurrency objects
    if (supportedCurrencies && supportedCurrencies.length > 0) {
      const currencies = supportedCurrencies.map(code => {
        const info = CURRENCY_INFO[code];
        return {
          code: code,
          symbol: info?.symbol || code,
          name: info?.name || code
        };
      });

      // Ensure USD is always first if present
      currencies.sort((a, b) => {
        if (a.code === 'USD') return -1;
        if (b.code === 'USD') return 1;
        return a.code.localeCompare(b.code);
      });

      return currencies;
    }

    // Fallback to essential currencies if oracle returns empty or fails
    const essentialCurrencies: FiatCurrency[] = [
      { code: 'USD', symbol: '$', name: 'US Dollar' },
      { code: 'EUR', symbol: '€', name: 'Euro' },
      { code: 'GBP', symbol: '£', name: 'British Pound' },
      { code: 'JPY', symbol: '¥', name: 'Japanese Yen' }
    ];

    return essentialCurrencies;
    
  } catch (error) {
    console.error('Error fetching available fiat currencies:', error);
    
    // Return minimal fallback list
    return [
      { code: 'USD', symbol: '$', name: 'US Dollar' },
      { code: 'EUR', symbol: '€', name: 'Euro' },
      { code: 'GBP', symbol: '£', name: 'British Pound' },
      { code: 'JPY', symbol: '¥', name: 'Japanese Yen' }
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
  return await getAssetPrice('XLM', fiatCurrency, network === 'mainnet' ? 'mainnet' : 'testnet');
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