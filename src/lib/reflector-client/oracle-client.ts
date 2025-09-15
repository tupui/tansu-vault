import { Contract, xdr, nativeToScVal, scValToNative } from '@stellar/stellar-sdk';
import { Server as SorobanServer } from '@stellar/stellar-sdk/rpc';
import { REFLECTOR_ORACLE_CONTRACTS } from '../appConfig';

interface CachedRate {
  rate: number;
  timestamp: number;
}

export class ReflectorOracleClient {
  private server: SorobanServer;
  private contractAddress: string;
  private cache = new Map<string, CachedRate>();
  private readonly CACHE_DURATION = 60_000; // 1 minute
  private readonly RATE_LIMIT_DURATION = 2_000; // 2 seconds
  private lastRequestTime = 0;

  constructor(network: 'mainnet' | 'testnet') {
    const rpcUrl = network === 'mainnet'
      ? 'https://soroban-rpc.mainnet.stellar.gateway.fm'
      : 'https://soroban-testnet.stellar.org:443';

    this.server = new SorobanServer(rpcUrl);
    this.contractAddress = REFLECTOR_ORACLE_CONTRACTS[network];
  }

  private getCacheKey(base: string, quote: string) {
    return `${base}_${quote}`;
  }

  private getFromCache(base: string, quote: string): number | null {
    const key = this.getCacheKey(base, quote);
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    return cached.rate;
  }

  private setCache(base: string, quote: string, rate: number) {
    const key = this.getCacheKey(base, quote);
    this.cache.set(key, { rate, timestamp: Date.now() });
  }

  private async rateLimit() {
    const now = Date.now();
    const delta = now - this.lastRequestTime;
    if (delta < this.RATE_LIMIT_DURATION) {
      await new Promise((r) => setTimeout(r, this.RATE_LIMIT_DURATION - delta));
    }
    this.lastRequestTime = Date.now();
  }

  private parseOracleResult(result: xdr.ScVal): number {
    const native = scValToNative(result);
    const asNumber = typeof native === 'number' ? native : typeof native === 'string' ? parseFloat(native) : NaN;
    if (!isFinite(asNumber)) {
      throw new Error('Invalid oracle result');
    }
    return asNumber;
  }

  private async lastPrice(base: string, quote: string): Promise<number> {
    await this.rateLimit();

    const contract = new Contract(this.contractAddress);
    const op = contract.call(
      'lastprice',
      nativeToScVal(base, { type: 'string' }),
      nativeToScVal(quote, { type: 'string' })
    );

    const sim: any = await this.server.simulateTransaction(op as any);
    if ('error' in sim) {
      throw new Error(`Oracle simulation error: ${sim.error}`);
    }

    const retval = sim.result?.retval as xdr.ScVal | undefined;
    if (!retval) throw new Error('Empty oracle response');

    return this.parseOracleResult(retval);
  }

  // Optional helper for FX, kept for parity with existing hooks
  async getFxRate(currency: string): Promise<number> {
    const cached = this.getFromCache('USD', currency);
    if (cached !== null) return cached;
    const rate = await this.lastPrice('USD', currency);
    this.setCache('USD', currency, rate);
    return rate;
  }

  async getAssetPrice(assetCode: string, currency: string = 'USD'): Promise<number> {
    const cached = this.getFromCache(assetCode, currency);
    if (cached !== null) return cached;

    const price = await this.lastPrice(assetCode, currency);
    this.setCache(assetCode, currency, price);
    return price;
  }

  // Discovery of available currencies from the oracle (if supported)
  async listSupportedCurrencies(): Promise<string[]> {
    const contract = new Contract(this.contractAddress);
    const op = contract.call('supported_currencies');
    const sim: any = await this.server.simulateTransaction(op as any);
    if ('error' in sim) {
      throw new Error(`Oracle listSupportedCurrencies error: ${sim.error}`);
    }
    const retval = sim.result?.retval as xdr.ScVal | undefined;
    if (!retval) return [];
    const native = scValToNative(retval);
    return Array.isArray(native) ? native.map((c) => String(c)) : [];
  }
}

// Export singleton instances
const mainnetClient = new ReflectorOracleClient('mainnet');
const testnetClient = new ReflectorOracleClient('testnet');

export const getOracleClient = (network: 'mainnet' | 'testnet'): ReflectorOracleClient =>
  network === 'mainnet' ? mainnetClient : testnetClient;
