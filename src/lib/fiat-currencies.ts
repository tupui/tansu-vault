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
export async function getXlmFiatRate(fiatCurrency: string): Promise<number> {
  try {
    // Use CoinGecko API as primary source (more reliable than Reflector FX)
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=${fiatCurrency.toLowerCase()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch XLM/${fiatCurrency} rate: ${response.status}`);
    }

    const data = await response.json();
    const rate = data?.stellar?.[fiatCurrency.toLowerCase()];
    
    if (rate && typeof rate === 'number') {
      return rate;
    }
    
    throw new Error('Invalid rate data received');

  } catch (error) {
    console.warn(`Failed to fetch XLM/${fiatCurrency} rate, using fallback:`, error);
    
    // Fallback rates (updated approximate values)
    const fallbackRates: Record<string, number> = {
      USD: 0.12,
      EUR: 0.11,
      GBP: 0.095,
      JPY: 18,
      CAD: 0.16,
      AUD: 0.18,
      CHF: 0.11,
      BTC: 0.0000028,
      ETH: 0.000033,
    };
    
    return fallbackRates[fiatCurrency.toUpperCase()] || 0.12;
  }
}

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