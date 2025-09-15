import { Contract, Address, xdr, nativeToScVal } from '@stellar/stellar-sdk';
import { Server as SorobanServer } from '@stellar/stellar-sdk/rpc';
import { REFLECTOR_ORACLE_CONTRACTS } from '../appConfig';

interface OraclePrice {
  price: string;
  timestamp: number;
}

interface CachedRate {
  rate: number;
  timestamp: number;
  currency: string;
}

class ReflectorOracleClient {
  private server: SorobanServer;
  private contractAddress: string;
  private cache = new Map<string, CachedRate>();
  private readonly CACHE_DURATION = 60000; // 1 minute
  private readonly RATE_LIMIT_DURATION = 5000; // 5 seconds
  private lastRequestTime = 0;

  constructor(network: 'mainnet' | 'testnet') {
    const rpcUrl = network === 'mainnet' 
      ? 'https://soroban-rpc.mainnet.stellar.gateway.fm'
      : 'https://soroban-testnet.stellar.org:443';
    
    this.server = new SorobanServer(rpcUrl);
    this.contractAddress = REFLECTOR_ORACLE_CONTRACTS[network];
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.RATE_LIMIT_DURATION) {
      const waitTime = this.RATE_LIMIT_DURATION - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  private getCacheKey(asset: string, currency: string): string {
    return `${asset}_${currency}`;
  }

  private getFromCache(asset: string, currency: string): number | null {
    const key = this.getCacheKey(asset, currency);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.rate;
  }

  private setCache(asset: string, currency: string, rate: number): void {
    const key = this.getCacheKey(asset, currency);
    this.cache.set(key, {
      rate,
      timestamp: Date.now(),
      currency
    });
  }

  /**
   * Get FX rate from Reflector Oracle
   */
  async getFxRate(currency: string): Promise<number> {
    // Check cache first
    const cached = this.getFromCache('USD', currency);
    if (cached !== null) {
      return cached;
    }

    // Apply rate limiting
    await this.rateLimit();

    try {
      const contract = new Contract(this.contractAddress);
      
      // Create the contract call
      const operation = contract.call(
        'lastprice',
        nativeToScVal(Address.fromString('GCKFBEIYTKP5RDBKZ5T4XWUVQNKDGKB7WKZL2XHFGMQ5VCZFWQJGCPPM')), // USD asset
        nativeToScVal(Address.fromString(this.getCurrencyAssetAddress(currency)))
      );

      // Simulate the contract call
      const tx = await this.server.simulateTransaction(operation as any);
      
      if ('error' in tx) {
        throw new Error(`Oracle error: ${tx.error}`);
      }

      // Parse the result
      const result = tx.result?.retval;
      if (!result) {
        throw new Error('No result from oracle');
      }

      // Convert the result to a rate
      const rate = this.parseOracleResult(result);
      
      // Cache the result
      this.setCache('USD', currency, rate);
      
      return rate;
    } catch (error) {
      console.warn(`Failed to fetch FX rate for ${currency}:`, error);
      
      // Return fallback rates for common currencies
      const fallbackRates: Record<string, number> = {
        'EUR': 0.85,
        'GBP': 0.73,
        'JPY': 110.0,
        'CAD': 1.25,
        'AUD': 1.35,
        'CHF': 0.92,
        'CNY': 6.45,
        'INR': 74.5
      };
      
      return fallbackRates[currency] || 1.0;
    }
  }

  /**
   * Get asset price from oracle
   */
  async getAssetPrice(assetCode: string, currency: string = 'USD'): Promise<number> {
    const cacheKey = `${assetCode}_${currency}`;
    const cached = this.getFromCache(assetCode, currency);
    if (cached !== null) {
      return cached;
    }

    await this.rateLimit();

    try {
      // For XLM, use a different approach since it's the native asset
      if (assetCode === 'XLM') {
        // Get XLM price in USD first, then convert to target currency
        const xlmUsdPrice = await this.getXlmUsdPrice();
        
        if (currency === 'USD') {
          this.setCache(assetCode, currency, xlmUsdPrice);
          return xlmUsdPrice;
        }
        
        // Convert to target currency
        const fxRate = await this.getFxRate(currency);
        const convertedPrice = xlmUsdPrice * fxRate;
        
        this.setCache(assetCode, currency, convertedPrice);
        return convertedPrice;
      }
      
      // For other assets, implement oracle lookup
      return this.getGenericAssetPrice(assetCode, currency);
    } catch (error) {
      console.warn(`Failed to fetch price for ${assetCode}:`, error);
      
      // Fallback prices for development
      const fallbackPrices: Record<string, number> = {
        'XLM': 0.12,
        'USDC': 1.0,
        'USDT': 1.0
      };
      
      return fallbackPrices[assetCode] || 0;
    }
  }

  private async getXlmUsdPrice(): Promise<number> {
    // Implement XLM/USD price fetching logic
    // This would typically involve calling the oracle with XLM asset parameters
    return 0.12; // Fallback price
  }

  private async getGenericAssetPrice(assetCode: string, currency: string): Promise<number> {
    // Implement generic asset price fetching
    return 0; // Placeholder
  }

  private getCurrencyAssetAddress(currency: string): string {
    // Map currency codes to Stellar asset addresses
    const currencyAssets: Record<string, string> = {
      'EUR': 'GCKFBEIYTKP5RDBKZ5T4XWUVQNKDGKB7WKZL2XHFGMQ5VCZFWQJGCPPM',
      'GBP': 'GCKFBEIYTKP5RDBKZ5T4XWUVQNKDGKB7WKZL2XHFGMQ5VCZFWQJGCPPM',
      // Add more currency mappings as needed
    };
    
    return currencyAssets[currency] || 'GCKFBEIYTKP5RDBKZ5T4XWUVQNKDGKB7WKZL2XHFGMQ5VCZFWQJGCPPM';
  }

  private parseOracleResult(result: xdr.ScVal): number {
    // Parse the XDR result to extract the numeric price
    // This is a simplified implementation
    try {
      const value = result.value();
      if (typeof value === 'number') {
        return value / 1e7; // Adjust for decimal places
      }
      if (typeof value === 'string') {
        return parseFloat(value) / 1e7;
      }
      return 1.0; // Fallback for other types
    } catch {
      return 1.0; // Fallback
    }
  }
}

// Export singleton instances
const mainnetClient = new ReflectorOracleClient('mainnet');
const testnetClient = new ReflectorOracleClient('testnet');

export const getOracleClient = (network: 'mainnet' | 'testnet'): ReflectorOracleClient => {
  return network === 'mainnet' ? mainnetClient : testnetClient;
};

export { ReflectorOracleClient };