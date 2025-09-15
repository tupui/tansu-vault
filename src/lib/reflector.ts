import { Contract, xdr, nativeToScVal } from '@stellar/stellar-sdk';
import { Server as SorobanServer } from '@stellar/stellar-sdk/rpc';
import { REFLECTOR_ORACLE_CONTRACTS } from './appConfig';
import { parseAsset, AssetInfo, AssetType } from './reflector-client/asset-type';
import { buildAssetScVal, parseSorobanResult, scalePrice } from './reflector-client/xdr-helper';

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
  private priceCache = new Map<string, CachedPrice>();
  private assetListCache = new Map<string, CachedAssetList>();
  private requestQueue = new Map<string, Promise<number>>();
  private network: 'mainnet' | 'testnet';
  
  // Rate limiting
  private readonly WINDOW_MS = 10_000; // 10 seconds
  private readonly BURST_LIMIT = 50; // 50 calls per window
  private requestTimes: number[] = [];
  
  // Cache durations
  private readonly PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly ASSETS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

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
  }

  private getCacheKey(asset: string, quote: string): string {
    return `${asset}_${quote}`;
  }

  private getFromCache(asset: string, quote: string): number | null {
    const key = this.getCacheKey(asset, quote);
    const cached = this.priceCache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.PRICE_CACHE_DURATION) {
      this.priceCache.delete(key);
      return null;
    }
    
    return cached.price;
  }

  private setCache(asset: string, quote: string, price: number): void {
    const key = this.getCacheKey(asset, quote);
    this.priceCache.set(key, { price, timestamp: Date.now() });
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
      const sim: any = await this.server.simulateTransaction(op as any);
      
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
    const requestKey = `${assetCode}_${quote}`;
    if (this.requestQueue.has(requestKey)) {
      return this.requestQueue.get(requestKey)!;
    }

    const pricePromise = this.fetchAssetPriceInternal(assetCode, quote);
    this.requestQueue.set(requestKey, pricePromise);
    
    try {
      const price = await pricePromise;
      this.setCache(assetCode, quote, price);
      return price;
    } finally {
      this.requestQueue.delete(requestKey);
    }
  }

  private async fetchAssetPriceInternal(assetCode: string, quote: string): Promise<number> {
    const asset = parseAsset(assetCode);
    
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
    
    const cached = this.getFromCache('USD', currency);
    if (cached !== null) return cached;

    try {
      const usdAsset = parseAsset('USD');
      const rate = await this.fetchPriceFromOracle('FX', usdAsset, currency);
      this.setCache('USD', currency, rate);
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
    this.priceCache.clear();
    this.assetListCache.clear();
  }
}

// Singleton instances
const mainnetEngine = new ReflectorPriceEngine('mainnet');
const testnetEngine = new ReflectorPriceEngine('testnet');

export const getPriceEngine = (network: 'mainnet' | 'testnet'): ReflectorPriceEngine =>
  network === 'mainnet' ? mainnetEngine : testnetEngine;

// Convenience functions
export const getAssetPrice = async (
  assetCode: string, 
  quote: string = 'USD', 
  network: 'mainnet' | 'testnet' = 'testnet'
): Promise<number> => {
  const engine = getPriceEngine(network);
  return engine.getPrice(assetCode, quote);
};

export const getAssetPrices = async (
  assets: string[], 
  quote: string = 'USD', 
  network: 'mainnet' | 'testnet' = 'testnet'
): Promise<Record<string, number>> => {
  const engine = getPriceEngine(network);
  return engine.getPrices(assets, quote);
};