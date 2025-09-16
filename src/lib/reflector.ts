import { Contract, xdr, nativeToScVal, TransactionBuilder, Account } from '@stellar/stellar-sdk';
import { Server as SorobanServer } from '@stellar/stellar-sdk/rpc';
import { REFLECTOR_ORACLE_CONTRACTS, getNetworkConfig, CACHE_CONFIG } from './appConfig';
import { parseAsset, AssetInfo, AssetType } from './reflector-client/asset-type';
import { buildAssetScVal, parseSorobanResult, scalePrice } from './reflector-client/xdr-helper';
import { priceCache, fxRateCache } from './enhanced-cache';

interface OracleConfig {
  contract: string;
  base: string;
  decimals: number;
}

interface CachedPrice {
  price: number;
  timestamp: number;
}

interface CachedAssetList {
  assets: string[];
  timestamp: number;
}

const REFLECTOR_ORACLES: Record<string, OracleConfig> = {
  CEX_DEX: {
    contract: '', // Will be set dynamically
    base: 'USD',
    decimals: 14
  },
  STELLAR: {
    contract: '', // Will be set dynamically  
    base: 'USDC',
    decimals: 14
  },
  FX: {
    contract: '', // Will be set dynamically
    base: 'USD',
    decimals: 14
  }
};

class ReflectorPriceEngine {
  private server: SorobanServer;
  private network: 'mainnet' | 'testnet';
  private networkPassphrase: string;
  
  // Rate limiting
  private readonly WINDOW_MS = CACHE_CONFIG.RATE_LIMIT_WINDOW;
  private readonly BURST_LIMIT = CACHE_CONFIG.RATE_LIMIT_BURST;
  private requestTimes: number[] = [];
  
  // Request deduplication
  private pendingRequests = new Map<string, Promise<number>>();

  constructor(network: 'mainnet' | 'testnet') {
    this.network = network;
    const rpcUrl = network === 'mainnet'
      ? 'https://soroban-rpc.mainnet.stellar.gateway.fm'
      : 'https://soroban-testnet.stellar.org:443';

    this.server = new SorobanServer(rpcUrl);
    
    // Set oracle contracts for network
    const contracts = REFLECTOR_ORACLE_CONTRACTS[network];
    REFLECTOR_ORACLES.CEX_DEX.contract = contracts.external_cex;
    REFLECTOR_ORACLES.STELLAR.contract = contracts.pubnet;
    REFLECTOR_ORACLES.FX.contract = contracts.forex;

    // Network passphrase for transaction simulation
    this.networkPassphrase = getNetworkConfig(network).networkPassphrase;
  }


  private getFromCache(asset: string, quote: string): number | null {
    const key = `${this.network}:${asset}_${quote}`;
    return priceCache.get(key);
  }

  private setCache(asset: string, quote: string, price: number): void {
    const key = `${this.network}:${asset}_${quote}`;
    priceCache.set(key, price);
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requestTimes = this.requestTimes.filter(time => now - time < this.WINDOW_MS);
    
    // Check if we're at the limit
    if (this.requestTimes.length >= this.BURST_LIMIT) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = this.WINDOW_MS - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.rateLimit(); // Retry after waiting
    }
    
    this.requestTimes.push(now);
  }

  private async fetchPriceFromOracle(
    oracleKey: string, 
    asset: AssetInfo, 
    quote: string,
    retries = 3
  ): Promise<number> {
    const oracle = REFLECTOR_ORACLES[oracleKey];
    if (!oracle) throw new Error(`Unknown oracle: ${oracleKey}`);

    await this.rateLimit();

    try {
      const contract = new Contract(oracle.contract);
      const assetScVal = buildAssetScVal(asset);
      const quoteScVal = nativeToScVal(quote, { type: 'string' });

      const op = contract.call('lastprice', assetScVal, quoteScVal);
      const source = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
      const tx = new TransactionBuilder(source, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(op)
        .setTimeout(30)
        .build();

      const sim: any = await this.server.simulateTransaction(tx);
      
      if ('error' in sim) {
        throw new Error(`Oracle simulation error: ${sim.error}`);
      }

      const retval = sim.result?.retval as xdr.ScVal | undefined;
      if (!retval) throw new Error('Empty oracle response');

      const rawPrice = parseSorobanResult(retval);
      return scalePrice(rawPrice, oracle.decimals);
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries))); // Exponential backoff
        return this.fetchPriceFromOracle(oracleKey, asset, quote, retries - 1);
      }
      throw error;
    }
  }

  private async getAssetPrice(assetCode: string, quote: string = 'USD'): Promise<number> {
    // Check cache first
    const cached = this.getFromCache(assetCode, quote);
    if (cached !== null) return cached;

    // Deduplicate requests
    const requestKey = `${this.network}:${assetCode}_${quote}`;
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey)!;
    }

    const pricePromise = this.fetchAssetPriceInternal(assetCode, quote);
    this.pendingRequests.set(requestKey, pricePromise);
    
    try {
      const price = await pricePromise;
      this.setCache(assetCode, quote, price);
      return price;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }

  private async fetchAssetPriceInternal(assetCode: string, quote: string): Promise<number> {
    const asset = parseAsset(assetCode);
    
    // Special case: Direct fiat-to-fiat conversion (avoid pricing fiat as asset)
    if (asset.type === AssetType.Other && quote !== 'USD') {
      // If both base and quote are fiat, use FX oracle directly
      if (assetCode === 'USD') {
        return await this.getFxRate(quote);
      } else {
        // For other fiat currencies, this should not happen in practice
        throw new Error(`Unsupported fiat-to-fiat conversion: ${assetCode} to ${quote}`);
      }
    }
    
    // Handle fiat-to-fiat conversion via FX oracle
    if (quote !== 'USD' && asset.type === AssetType.Other) {
      const usdPrice = await this.getAssetPrice(assetCode, 'USD');
      const fxRate = await this.getFxRate(quote);
      return usdPrice * fxRate;
    }

    // Try different oracles based on asset type
    const errors: string[] = [];

    if (asset.type === AssetType.Stellar) {
      // Try STELLAR oracle first for Stellar assets
      try {
        return await this.fetchPriceFromOracle('STELLAR', asset, quote);
      } catch (error) {
        errors.push(`STELLAR: ${error}`);
      }
    }

    // Try CEX_DEX oracle
    try {
      return await this.fetchPriceFromOracle('CEX_DEX', asset, quote);
    } catch (error) {
      errors.push(`CEX_DEX: ${error}`);
    }

    // For non-USD quotes, try getting USD price then convert
    if (quote !== 'USD') {
      try {
        const usdPrice = await this.getAssetPrice(assetCode, 'USD');
        const fxRate = await this.getFxRate(quote);
        return usdPrice * fxRate;
      } catch (error) {
        errors.push(`FX conversion: ${error}`);
      }
    }

    throw new Error(`Failed to get price for ${assetCode}: ${errors.join(', ')}`);
  }

  private async getFxRate(currency: string): Promise<number> {
    if (currency === 'USD') return 1;
    
    // Use dedicated FX cache
    const key = `${this.network}:USD_${currency}`;
    const cached = fxRateCache.get(key);
    if (cached !== null) return cached;

    try {
      const usdAsset = parseAsset('USD');
      const rate = await this.fetchPriceFromOracle('FX', usdAsset, currency);
      fxRateCache.set(key, rate);
      return rate;
    } catch (error) {
      throw new Error(`Failed to get FX rate for ${currency}: ${error}`);
    }
  }

  public async getPrice(assetCode: string, quote: string = 'USD'): Promise<number> {
    return this.getAssetPrice(assetCode, quote);
  }

  public async getPrices(assets: string[], quote: string = 'USD'): Promise<Record<string, number>> {
    const promises = assets.map(async (asset) => {
      try {
        const price = await this.getPrice(asset, quote);
        return { asset, price };
      } catch (error) {
        console.warn(`Failed to get price for ${asset}:`, error);
        return { asset, price: 0 };
      }
    });

    const results = await Promise.all(promises);
    return results.reduce((acc, { asset, price }) => {
      acc[asset] = price;
      return acc;
    }, {} as Record<string, number>);
  }

  public clearCache(): void {
    priceCache.clear();
    fxRateCache.clear();
    this.pendingRequests.clear();
  }

  public clearFxCache(): void {
    fxRateCache.clear();
  }
}

// Singleton instances
const mainnetEngine = new ReflectorPriceEngine('mainnet');
const testnetEngine = new ReflectorPriceEngine('testnet');

export const getPriceEngine = (network: 'mainnet' | 'testnet'): ReflectorPriceEngine =>
  network === 'mainnet' ? mainnetEngine : testnetEngine;

// Convenience functions (always use mainnet for accurate pricing)
export const getAssetPrice = async (
  assetCode: string, 
  quote: string = 'USD', 
  network: 'mainnet' | 'testnet' = 'mainnet' // Default to mainnet for pricing
): Promise<number> => {
  const engine = getPriceEngine('mainnet'); // Always use mainnet for pricing
  return engine.getPrice(assetCode, quote);
};

export const getAssetPrices = async (
  assets: string[], 
  quote: string = 'USD', 
  network: 'mainnet' | 'testnet' = 'mainnet' // Default to mainnet for pricing
): Promise<Record<string, number>> => {
  const engine = getPriceEngine('mainnet'); // Always use mainnet for pricing
  return engine.getPrices(assets, quote);
};

// Clear caches when currency changes
export const clearPriceCaches = (network?: 'mainnet' | 'testnet') => {
  if (network) {
    getPriceEngine(network).clearCache();
  } else {
    mainnetEngine.clearCache();
    testnetEngine.clearCache();
  }
};

export const clearFxCaches = (network?: 'mainnet' | 'testnet') => {
  if (network) {
    getPriceEngine(network).clearFxCache();
  } else {
    mainnetEngine.clearFxCache();
    testnetEngine.clearFxCache();
  }
};